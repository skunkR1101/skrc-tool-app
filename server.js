import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import unzipper from "unzipper";
import archiver from "archiver";

const app = express();
const PORT = process.env.PORT || 3000;

/* ===== フォルダ準備 ===== */
const dirs = ["uploads", "work", "output"];
dirs.forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d);
});

/* ===== static ===== */
app.use(express.static("public"));

/* ===== upload ===== */
const upload = multer({ dest: "uploads/" });

/* =========================================================
   wav → ogg 一括変換（フォルダ構造保持）
========================================================= */
app.post("/convert", upload.single("zip"), async (req, res) => {
  const zipPath = req.file.path;
  const workDir = path.join("work", Date.now().toString());
  const outZip = path.join("output", `result_${Date.now()}.zip`);

  fs.mkdirSync(workDir);

  try {
    /* --- zip解凍 --- */
    await fs.createReadStream(zipPath)
      .pipe(unzipper.Extract({ path: workDir }))
      .promise();

    /* --- wav探索 --- */
    const wavFiles = [];

    function findWav(dir) {
      fs.readdirSync(dir).forEach(f => {
        const full = path.join(dir, f);
        if (fs.statSync(full).isDirectory()) {
          findWav(full);
        } else if (f.toLowerCase().endsWith(".wav")) {
          wavFiles.push(full);
        }
      });
    }
    findWav(workDir);

    if (wavFiles.length === 0) {
      return res.status(400).send("wavファイルが見つかりません");
    }

    console.log(`🚄 wav検出数: ${wavFiles.length}`);

    /* --- ogg変換 --- */
    wavFiles.forEach(wav => {
      const ogg = wav.replace(/\.wav$/i, ".ogg");
      console.log("変換:", wav);
      execSync(`ffmpeg -y -i "${wav}" -qscale:a 5 "${ogg}"`);
    });

    /* --- zip生成（フォルダ構造保持） --- */
    const output = fs.createWriteStream(outZip);
    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.pipe(output);

    wavFiles.forEach(wav => {
      const ogg = wav.replace(/\.wav$/i, ".ogg");

      archive.file(ogg, {
        // ★ ここが最重要：workDir からの相対パス
        name: path.relative(workDir, ogg)
      });
    });

    await archive.finalize();

    /* --- ダウンロード --- */
    res.download(outZip, "SKRC_ogg_converted.zip");

  } catch (e) {
    console.error(e);
    res.status(500).send("変換エラー");
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
    fs.unlinkSync(zipPath);
  }
});

/* ===== 起動 ===== */
app.listen(PORT, () => {
  console.log(`🚄 SKRC server running on ${PORT}`);
});
