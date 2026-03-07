const express = require('express');
const multer = require('multer');
const { Octokit } = require("@octokit/rest");
const crypto = require('crypto');
const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const octokit = new Octokit({ auth: process.env.GH_TOKEN });
const OWNER = "BladeBrosBedwarsBacks1", REPO = "cloud-bridge-storage", PASS = process.env.ENCRYPT_KEY;
app.use(express.static('public'));
app.post('/upload', upload.single('file'), async (req, res) => {
try {
const iv = crypto.randomBytes(16);
const cipher = crypto.createCipheriv('aes-256-ctr', crypto.scryptSync(PASS, 'salt', 32), iv);
const encrypted = Buffer.concat([iv, cipher.update(req.file.buffer), cipher.final()]);
let release;
try { release = (await octokit.repos.getLatestRelease({ owner: OWNER, repo: REPO })).data; }
catch (e) { release = (await octokit.repos.createRelease({ owner: OWNER, repo: REPO, tag_name: 'v1' })).data; }
await octokit.repos.uploadReleaseAsset({
owner: OWNER, repo: REPO, release_id: release.id,
name: `${Date.now()}-${req.file.originalname}.enc`, data: encrypted
});
res.send("Success: Encrypted & Uploaded.");
} catch (err) { res.status(500).send(err.message); }
});
app.listen(process.env.PORT || 3000);
app.get('/files', async (req, res) => {
const { data } = await octokit.repos.getLatestRelease({ owner: OWNER, repo: REPO });
res.json(data.assets.map(a => ({ name: a.name, url: a.browser_download_url })));
});