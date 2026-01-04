import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import unzipper from "unzipper";
import archiver from "archiver";
import { execSync } from "child_process";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));

const upload = multer({ dest: "uploads/" });

app.post("/convert", upload.single("zip"), async (req, res) => {
  const zipPath = req.file.path;
  const workDir = `work/${Date.now()}`;
  fs.mkdirSync(workDir, { recursive: true });

  try {
    /* ===== zip展開 ===== */
    await fs.createReadStream(zipPath)
      .pipe(unzipper.Extract({ path: workDir }))
      .promise();

    /* ===== wav探索 ===== */
    const wavFiles = [];
    const find = dir => {
      fs.readdirSync(dir).forEach(f => {
        const full = path.join(dir, f);
        if (fs.statSync(full).isDirectory()) find(full);
        else if (f.toLowerCase().endsWith(".wav")) wavFiles.push(full);
      });
    };
    find(workDir);

    if (!wavFiles.length) {
      return res.status(400).send("wavが見つかりません");
    }

    /* ===== レスポンス設定 ===== */
    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=SKRC_ogg_converted.zip"
    );

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.pipe(res);

    /* ===== 変換 + 追加 ===== */
    let done = 0;
    for (const wav of wavFiles) {
      const ogg = wav.replace(/\.wav$/i, ".ogg");

      execSync(`ffmpeg -y -i "${wav}" -qscale:a 5 "${ogg}"`);

      archive.file(ogg, {
        name: path.relative(workDir, ogg)
      });

      done++;
      console.log(`🚄 ${done}/${wavFiles.length} 変換完了`);
    }

    await archive.finalize();

  } catch (e) {
    console.error(e);
    res.status(500).send("変換失敗");
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
    fs.unlinkSync(zipPath);
  }
});

app.listen(PORT, () => {
  console.log(`🚄 SKRC server running on ${PORT}`);
});
