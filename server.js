import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import unzipper from "unzipper";
import archiver from "archiver";

const app = express();
const PORT = process.env.PORT || 3000;

// フォルダ準備
const dirs = ["uploads", "work"];
dirs.forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d);
});

// static
app.use(express.static("public"));

// upload設定
const upload = multer({ dest: "uploads/" });

app.post("/convert", upload.single("zip"), async (req, res) => {
  const zipPath = req.file.path;
  const workDir = `work/${Date.now()}`;

  fs.mkdirSync(workDir);

  try {
    // zip解凍
    await fs.createReadStream(zipPath)
      .pipe(unzipper.Extract({ path: workDir }))
      .promise();

    // wav検索
    const wavFiles = [];
    function findWav(dir) {
      fs.readdirSync(dir).forEach(f => {
        const full = path.join(dir, f);
        if (fs.statSync(full).isDirectory()) findWav(full);
        else if (f.toLowerCase().endsWith(".wav")) wavFiles.push(full);
      });
    }
    findWav(workDir);

    if (wavFiles.length === 0) {
      return res.status(400).send("wavが見つかりません");
    }

    // ogg変換
    wavFiles.forEach(wav => {
      const ogg = wav.replace(/\.wav$/i, ".ogg");
      execSync(`ffmpeg -y -i "${wav}" -qscale:a 5 "${ogg}"`);
    });

    // ===== ZIPを直接レスポンスに流す =====
    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=SKRC_ogg_converted.zip"
    );

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.pipe(res);

    wavFiles.forEach(wav => {
      const ogg = wav.replace(/\.wav$/i, ".ogg");
      archive.file(ogg, { name: path.basename(ogg) });
    });

    await archive.finalize(); // ← これで100%完成ZIPが流れる

  } catch (e) {
    console.error(e);
    if (!res.headersSent) {
      res.status(500).send("変換エラー");
    }
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
    fs.unlinkSync(zipPath);
  }
});

app.listen(PORT, () => {
  console.log(`🚄 SKRC server running on ${PORT}`);
});
