# Auto-Build Windows Installer with GitHub Actions

This guide gets you from "I have the code" to "students download a `.exe` from GitHub" in about 15 minutes. You'll never need to install Node.js or build tools on your own machine.

## One-time setup (15 minutes)

### 1. Create a GitHub account
If you don't have one: https://github.com/signup

### 2. Create a new repository
- Go to https://github.com/new
- Name it something like `student-agent-builder`
- Make it **Public** (free Actions minutes) or **Private** (uses your monthly allowance)
- Don't add a README, .gitignore, or license — we already have them
- Click **Create repository**

### 3. Install Git on your machine
- Download from https://git-scm.com/download/win
- Run installer, accept defaults

### 4. Push the code to GitHub
Open PowerShell in the extracted `student-agent-builder` folder and run:

```powershell
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/student-agent-builder.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

GitHub will ask you to log in — either through the browser popup or a Personal Access Token. The browser flow is easier.

### 5. Watch the build run
- Open your repo on GitHub
- Click the **Actions** tab at the top
- You'll see "Build Windows Installer" running (yellow circle → green checkmark when done)
- First build takes ~5-7 minutes because it has to install everything fresh
- Subsequent builds are faster (~3 minutes) thanks to dependency caching

### 6. Download the `.exe`
Once the build is green:
- Click on the workflow run
- Scroll down to **Artifacts**
- Download `student-agent-builder-windows.zip`
- Extract it → inside is your `.exe` installer

## After setup: how to ship updates

Whenever you change code:

```powershell
git add .
git commit -m "Added WhatsApp support"
git push
```

GitHub automatically builds a fresh `.exe`. You get a green checkmark in ~3 minutes.

## Publishing official releases (for students to download)

When you want to publish a real version students can download:

```powershell
# Tag the version
git tag v0.1.0
git push origin v0.1.0
```

The workflow detects the tag and **automatically creates a GitHub Release** with the `.exe` attached. Students download it from:

```
https://github.com/YOUR_USERNAME/student-agent-builder/releases/latest
```

Bump the version in `package.json` first (`"version": "0.2.0"`), then tag with the same number (`git tag v0.2.0`).

## Troubleshooting

### "Build failed: better-sqlite3 prebuilt binary not available"
GitHub's Windows runner usually has the C++ build tools pre-installed, so this shouldn't happen. If it does, add this step to the workflow before `npm install`:

```yaml
      - name: Setup MSBuild
        uses: microsoft/setup-msbuild@v2
```

### "permission denied" on first push
You probably need to authenticate. Use GitHub CLI:
```powershell
winget install --id GitHub.cli
gh auth login
```

### Build is slow
First build is always slowest (~7 min). The workflow caches npm dependencies so subsequent builds drop to ~3 min. If you want faster: switch to GitHub's paid runners (overkill for v1).

### "Windows protected your PC" when running the .exe
Expected — your installer isn't code-signed yet. Users click **More info → Run anyway**. To eliminate this warning permanently, you need a code signing certificate (~$200/year from DigiCert, Sectigo, etc.) or use Microsoft's free option via the Trusted Publisher path. That's a v2 problem.

## What you'll see in GitHub

After this is set up, your repo's home page shows:
- A green ✓ badge next to every commit that built successfully
- A "Releases" sidebar on the right with the latest .exe download
- A clean URL to share with students: `github.com/YOU/student-agent-builder/releases`

That's it — you now have a real CI/CD pipeline for a desktop app, with zero ongoing effort.
