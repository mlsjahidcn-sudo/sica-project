# Hostinger Deployment - Next.js Fixed

## ✅ Changes Made to Fix "Unsupported Framework" Error

The following files were created/modified to help Hostinger recognize this as a Node.js/Next.js project:

1. **framework.json** - Framework detection file
2. **app.yaml** - Hostinger Node.js runtime configuration  
3. **process.json** - PM2-style process configuration for Passenger
4. **public/.htaccess** - Apache rewrite rules for Node.js proxy
5. **next.config.ts** - Enabled `output: 'standalone'` for self-contained deployment

---

## 🚀 Deployment Instructions for Hostinger

### Method 1: Git Deployment (Recommended)

1. **Push these changes to your GitHub repository:**
   ```bash
   git add framework.json app.yaml process.json public/.htaccess next.config.ts
   git commit -m "Add Hostinger deployment configuration"
   git push origin Codebuddy
   ```

2. **In Hostinger hPanel:**
   - Go to **Website** → **Git**
   - Connect your GitHub repository
   - Set branch: `Codebuddy`
   - Set build command: `npm install --legacy-peer-deps && npm run build`
   - Set start command: `node .next/standalone/server.js`
   - Set directory: `/domains/lawngreen-fox-388897.hostingersite.com/public_html`

3. **Add Environment Variables:**
   Go to **Settings** → **Environment Variables** and add:
   ```
   COZE_SUPABASE_URL=https://maqzxlcsgfpwnfyleoga.supabase.co
   COZE_SUPABASE_ANON_KEY=<your-anon-key>
   COZE_SUPABASE_SERVICE_ROLE_KEY=<your-service-key>
   NEXT_PUBLIC_APP_URL=https://lawngreen-fox-388897.hostingersite.com
   NODE_ENV=production
   ```

### Method 2: SSH Manual Deployment

1. **Connect via SSH:**
   ```bash
   ssh u863228546@lawngreen-fox-388897.hostingersite.com
   ```

2. **Navigate to public_html:**
   ```bash
   cd ~/domains/lawngreen-fox-388897.hostingersite.com/public_html
   ```

3. **Pull latest changes:**
   ```bash
   git pull origin Codebuddy
   ```

4. **Install dependencies:**
   ```bash
   npm install --legacy-peer-deps
   ```

5. **Build the project:**
   ```bash
   npm run build
   ```

6. **Create .env.local:**
   ```bash
   nano .env.local
   ```
   Add all environment variables, then save (Ctrl+O, Enter, Ctrl+X)

7. **Start the server:**
   ```bash
   node .next/standalone/server.js
   ```

---

## 📁 Required Files in Repository

Make sure these files are pushed to GitHub:
- ✅ framework.json
- ✅ app.yaml
- ✅ process.json
- ✅ public/.htaccess
- ✅ next.config.ts (updated)

---

## 🔧 If Hostinger Still Shows "Unsupported Framework"

Try these additional fixes:

### Option A: Use Vercel Instead (Easiest)
```bash
npm i -g vercel
vercel
```

### Option B: Check Hostinger Node.js Settings
- Go to hPanel → Website → Node.js
- Make sure Node.js version is 18 or 20
- Set application root to `/public_html`

### Option C: Contact Hostinger Support
Ask them to enable "Node.js application" mode for your domain.

---

## 📝 Quick Reference - Environment Variables Needed

```
COZE_SUPABASE_URL=https://maqzxlcsgfpwnfyleoga.supabase.co
COZE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcXp4bGNzZ2Zwd25meWxlb2dhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1Nzc4MTMsImV4cCI6MjA5MTE1MzgxM30.tfWBBDlwo17Y5luljRNxmVpupj9rChZhcQxDQ-hvbc4
COZE_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcXp4bGNzZ2Zwd25meWxlb2dhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTU3NzgxMywiZXhwIjoyMDkxMTUzODEzfQ.RG4cM2EoccJXqsSggkQ2cA8aYcDQiToSRmKxKjkZppY
NEXT_PUBLIC_SUPABASE_URL=https://maqzxlcsgfpwnfyleoga.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcXp4bGNzZ2Zwd25meWxlb2dhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1Nzc4MTMsImV4cCI6MjA5MTE1MzgxM30.tfWBBDlwo17Y5luljRNxmVpupj9rChZhcQxDQ-hvbc4
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://lawngreen-fox-388897.hostingersite.com
```

---

## ⚠️ Important Notes

1. **Standalone mode is now enabled** - the build will create a self-contained Node.js server
2. **Static assets** will be served from `public/_next/static` for better performance
3. **Port 3000** is used by default - Hostinger may need configuration for this

## 🆘 If Deployment Still Fails

Consider using **Vercel** for easier Next.js deployment:
```bash
npm i -g vercel
vercel --prod
```

Vercel automatically recognizes Next.js and handles all configuration.