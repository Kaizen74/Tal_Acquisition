# Talent Acquisition RPG Dashboard

A gamified talent assessment platform that visualizes job role requirements as RPG character profiles and compares candidates against "Success Profiles" using fantasy game metaphors.

## Features

- **RPG-Style Character Sheets**: View job requirements as character classes with competency stats
- **Radar Chart Visualization**: Compare candidate competencies against success profile requirements
- **Experience Badges**: Track achievements with visual badge system
- **Skill Tree Inventory**: Interactive skill tree showing tool proficiencies
- **Candidate Comparison**: Side-by-side comparison of multiple candidates
- **PDF Resume Upload**: Upload multiple candidate resumes for automatic parsing
- **CSV Import**: Upload custom success profiles
- **Responsive Design**: Works on desktop and mobile devices

---

## Quick Start Guide (For Beginners)

### Step 1: Install Node.js

Node.js is required to run this application. If you don't have it installed:

**Windows:**
1. Go to https://nodejs.org/
2. Download the **LTS** version (recommended)
3. Run the installer and follow the prompts
4. Restart your computer after installation

**Mac:**
1. Go to https://nodejs.org/
2. Download the **LTS** version
3. Run the installer and follow the prompts

**Verify Installation:**
Open a terminal (Command Prompt on Windows, Terminal on Mac) and type:
```bash
node --version
```
You should see a version number like `v18.x.x` or higher.

### Step 2: Download the Project

**Option A - Using Git (Recommended):**
```bash
git clone https://github.com/Kaizen74/Tal_Acquisition.git
cd Tal_Acquisition
```

**Option B - Download ZIP:**
1. Go to the repository page on GitHub
2. Click the green "Code" button
3. Click "Download ZIP"
4. Extract the ZIP file to a folder on your computer
5. Open a terminal and navigate to that folder

### Step 3: Install Dependencies

In your terminal, make sure you're in the project folder, then run:
```bash
npm install
```

This will download all the required packages. It may take 1-2 minutes.

### Step 4: Start the Application

Run this command:
```bash
npm run dev
```

You should see output like:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.x.x:5173/
```

### Step 5: Open in Browser

Open your web browser and go to:
```
http://localhost:5173
```

You should see the Talent Acquisition RPG Dashboard!

### Step 6: Stop the Application

When you're done, press `Ctrl + C` in the terminal to stop the server.

---

## How to Use the Dashboard

### Viewing the Success Profile
The dashboard loads with a sample "Customer & Technical Support Team Lead" profile showing:
- **Competency Stats** (radar chart)
- **Experience Badges** (achievement icons)
- **Skill Tree** (tool proficiencies)
- **Sample Candidates** for comparison

### Comparing Candidates
1. Scroll down to the "Candidate Comparison" section
2. Click the **eye icon** on any candidate card to select/deselect
3. The selected candidate's stats will overlay on the radar chart
4. Match scores show how well each candidate fits the role

### Uploading Candidate Resumes (PDF)
1. Click the **"Upload Profile"** button in the header
2. The "Upload Resumes (PDF)" tab is selected by default
3. Drag and drop PDF resume files, or click to browse
4. The app will automatically extract:
   - Candidate name and contact info
   - Years of experience
   - Skills and certifications
   - Work history
5. Parsed candidates appear in the comparison section

### Uploading a Success Profile (CSV)
1. Click the **"Upload Profile"** button
2. Click the **"Upload Success Profile (CSV)"** tab
3. Click **"Download CSV Template"** to get the format
4. Edit the template with your role requirements
5. Drag and drop or upload the CSV file

---

## Deployment Guide

### Option 1: Netlify (Easiest - Free)

Netlify is a free hosting service perfect for beginners.

**Step-by-Step:**

1. **Build the project:**
   ```bash
   npm run build
   ```
   This creates a `dist` folder with your production files.

2. **Create a Netlify account:**
   - Go to https://www.netlify.com/
   - Click "Sign up" and create a free account

3. **Deploy:**
   - After logging in, you'll see a dashboard
   - Look for "Sites" section
   - Drag and drop the entire `dist` folder onto the page
   - Wait a few seconds for upload

4. **Your site is live!**
   - Netlify will give you a URL like `random-name-12345.netlify.app`
   - You can customize this in site settings

### Option 2: Vercel (Easy - Free)

Vercel is another popular free hosting option.

**Step-by-Step:**

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Deploy:**
   ```bash
   vercel
   ```

3. **Follow the prompts:**
   - Log in or create account when asked
   - Accept the default settings
   - Wait for deployment

4. **Your site is live!**
   - Vercel will give you a URL like `your-project.vercel.app`

### Option 3: GitHub Pages (Free)

If your code is on GitHub, you can host directly from there.

**Step-by-Step:**

1. **Install gh-pages:**
   ```bash
   npm install -D gh-pages
   ```

2. **Update package.json:**
   Open `package.json` and add these lines in the `"scripts"` section:
   ```json
   "predeploy": "npm run build",
   "deploy": "gh-pages -d dist"
   ```

   Also add at the top level:
   ```json
   "homepage": "https://YOUR_USERNAME.github.io/Tal_Acquisition"
   ```
   (Replace YOUR_USERNAME with your GitHub username)

3. **Deploy:**
   ```bash
   npm run deploy
   ```

4. **Enable GitHub Pages:**
   - Go to your repository on GitHub
   - Click "Settings" → "Pages"
   - Under "Source", select "gh-pages" branch
   - Click "Save"

5. **Your site is live!**
   - Access at `https://YOUR_USERNAME.github.io/Tal_Acquisition`

---

## Troubleshooting

### "npm: command not found"
Node.js is not installed or not in your PATH. Reinstall Node.js and restart your terminal.

### "Cannot find module" errors
Run `npm install` again to ensure all dependencies are installed.

### Port 5173 already in use
Another application is using that port. Either:
- Close the other application
- Or run: `npm run dev -- --port 3000` (uses port 3000 instead)

### PDF parsing not working
- Make sure the PDF is text-based (not a scanned image)
- Try a different PDF file
- Check the browser console for error messages (press F12)

### Styles look broken
Clear your browser cache or try a hard refresh:
- Windows: `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`

---

## Project Structure

```
Tal_Acquisition/
├── public/
│   └── templates/
│       └── success-profile-template.csv   # CSV template
├── src/
│   ├── components/
│   │   ├── Avatar.tsx              # Profile avatars
│   │   ├── CandidateCard.tsx       # Candidate cards
│   │   ├── Dashboard.tsx           # Main layout
│   │   ├── ExperienceBadges.tsx    # Badge grid
│   │   ├── FileUpload.tsx          # CSV upload
│   │   ├── MatchScore.tsx          # Score display
│   │   ├── RadarChart.tsx          # Stats chart
│   │   ├── ResumeUpload.tsx        # PDF upload
│   │   └── SkillTree.tsx           # Skill tree
│   ├── data/
│   │   ├── successProfile.ts       # Sample profile
│   │   └── candidateProfiles.ts    # Sample candidates
│   ├── utils/
│   │   ├── calculateMatch.ts       # Match scoring
│   │   ├── parseProfile.ts         # CSV parsing
│   │   ├── parseResume.ts          # PDF parsing
│   │   └── cn.ts                   # Style utilities
│   ├── types/
│   │   └── index.ts                # TypeScript types
│   ├── App.tsx                     # App entry
│   ├── main.tsx                    # React entry
│   └── index.css                   # Global styles
├── index.html                      # HTML template
├── package.json                    # Dependencies
├── tailwind.config.js              # Tailwind config
├── tsconfig.json                   # TypeScript config
└── vite.config.ts                  # Vite config
```

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| React 18 | UI framework |
| TypeScript | Type safety |
| Vite | Build tool |
| Tailwind CSS | Styling |
| Recharts | Charts |
| PDF.js | PDF parsing |
| Papaparse | CSV parsing |
| React-dropzone | File uploads |
| Lucide React | Icons |

---

## Need Help?

- **Issues**: Report bugs at https://github.com/Kaizen74/Tal_Acquisition/issues
- **Questions**: Open a discussion or issue on GitHub

---

## License

MIT License - Feel free to use, modify, and distribute.
