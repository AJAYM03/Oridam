require('dotenv').config();
const { google } = require('googleapis');
const express = require('express');

const app = express();
const port = 3000;

// Configure the Google OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.REDIRECT_URI
);

// Define the scopes we need
const SCOPES = ['https://www.googleapis.com/auth/drive'];

// 1. Generate an authentication URL
app.get('/', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    // 'offline' gets us a refresh token, which is absolutely mandatory for a background sync architecture
    access_type: 'offline',
    // 'consent' forces the prompt, ensuring we get a refresh token even if they logged in before
    prompt: 'consent',
    scope: SCOPES,
  });
  res.send(`<h1>Oridam Spike</h1><a href="${url}">Click here to authenticate with Google</a>`);
});

// 2. Handle the callback from Google
app.get('/api/auth/callback/google', async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.status(400).send('No code returned from Google');
  }

  try {
    // Exchange the code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    console.log('--- AUTHENTICATION SUCCESS ---');
    console.log('Access Token:', tokens.access_token ? '[HIDDEN]' : 'Missing');
    console.log('Refresh Token:', tokens.refresh_token ? '[HIDDEN]' : 'Missing (This is bad, we need this!)');
    
    // Initialize the Drive API client
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // 3. Fetch Quota (The most important metric for our "Largest Free Space" router)
    const about = await drive.about.get({ fields: 'storageQuota,user' });
    const user = about.data.user;
    const quota = about.data.storageQuota;
    
    console.log(`\n--- ACCOUNT: ${user.emailAddress} ---`);
    const totalGB = (quota.limit / (1024 ** 3)).toFixed(2);
    const usedGB = (quota.usage / (1024 ** 3)).toFixed(2);
    const freeGB = ((quota.limit - quota.usage) / (1024 ** 3)).toFixed(2);
    console.log(`Storage: ${usedGB} GB used of ${totalGB} GB (${freeGB} GB free)`);

    // 4. Fetch the top 5 root files to prove we can read data
    console.log('\n--- ROOT FILES ---');
    const files = await drive.files.list({
      q: "'root' in parents and trashed = false",
      fields: 'files(id, name, mimeType, size)',
      pageSize: 5,
      orderBy: 'folder, modifiedTime desc'
    });

    if (files.data.files.length === 0) {
      console.log('No files found in root.');
    } else {
      files.data.files.forEach(file => {
        const type = file.mimeType === 'application/vnd.google-apps.folder' ? '[FOLDER]' : '[FILE]  ';
        const size = file.size ? `(${(file.size / 1024 / 1024).toFixed(2)} MB)` : '';
        console.log(`${type} ${file.name} ${size}`);
      });
    }

    res.send(`
      <h1>Success!</h1>
      <p>Check your terminal for the output.</p>
      <p>Now, close this tab, go back to the terminal, stop the server (Ctrl+C), start it again, and authenticate with a <b>SECOND</b> Google account to verify multi-account flow.</p>
    `);

  } catch (error) {
    console.error('Error during authentication or API call:', error);
    res.status(500).send('An error occurred. Check the terminal.');
  }
});

app.listen(port, () => {
  console.log(`\nOridam Phase 0 Spike is running!`);
  console.log(`Open your browser to: http://localhost:${port}\n`);
});
