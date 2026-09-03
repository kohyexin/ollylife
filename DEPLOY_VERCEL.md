# Publish the OlyLife demo with GitHub and Vercel

The repository root is now a standard Next.js App Router project. The browser UI is rendered by Next.js and all server-side Sumsub and demo API endpoints live under `app/api`.

## 1. Protect the credentials

Rotate the Sumsub Sandbox App Token and Secret Key that were previously shared in chat before publishing. Keep the replacement values only in `.env.local` and in Vercel Environment Variables. `.env.local` is excluded from Git and Vercel uploads.

## 2. Push to GitHub

Create an empty GitHub repository, then run these commands from this project folder:

```powershell
git init
git add .
git commit -m "Convert OlyLife demo to Next.js"
git branch -M main
git remote add origin https://github.com/YOUR-ACCOUNT/YOUR-REPOSITORY.git
git push -u origin main
```

Before committing, run `git status` and confirm that `.env.local` and `demo/.env.local` are not listed.

## 3. Import into Vercel

1. In Vercel, choose **Add New → Project** and import the GitHub repository.
2. Vercel should detect **Next.js** automatically. Keep the repository root as the Root Directory.
3. Add these Environment Variables to Preview and Production:
   - `SUMSUB_APP_TOKEN`
   - `SUMSUB_SECRET_KEY`
   - `SUMSUB_LEVEL_NAME=olylifetest`
4. Deploy. Every later push creates a new deployment; pushes to `main` update production and pull requests receive preview URLs.

## 4. Allow the deployed address in Sumsub

After Vercel creates the `https://...vercel.app` address, open Sumsub Dashboard → Dev space → WebSDK settings and add that hostname under **Domains to host WebSDK**. Reload the deployed demo and confirm it reports **Sandbox configured**.

## Demo-state limitation

The wallet, commission, card and transaction state is intentionally kept in each visitor's browser and resets with the demo. Sumsub token generation and applicant-data retrieval remain server-side. A production implementation should persist account and ledger changes in authenticated backend systems rather than trust browser-supplied balances.
