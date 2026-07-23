# 🚀 Staging Environment — Vercel Preview Deployments

**Status:** ✅ READY (Vercel fait ça par défaut)

---

## Setup

### App (lachattefc-app)
1. Va sur https://vercel.com/GeraldCECV/lachattefc-app
2. Settings → Git → Production Branch: `main`
3. Preview Branch: `develop` (ou tout branch != main)

### Admin (lachattefc-admin)
1. Va sur https://vercel.com/GeraldCECV/lachattefc-admin
2. Settings → Git → Production Branch: `main`
3. Preview Branch: `develop` (ou tout branch != main)

---

## Workflow

### Development
```bash
git checkout -b feature/xxx
# Code + commit
git push origin feature/xxx
# → Vercel crée preview auto: https://lachattefc-app-git-feature-xxx.vercel.app
# → Teste à volonté sans toucher prod
```

### Testing
```bash
# Une fois validé en preview
git push origin feature/xxx --force  # Update preview
# Vercel redeploy auto
```

### Production
```bash
git checkout develop
git merge feature/xxx
git push origin develop
# → Vercel déploy sur: https://staging-lachattefc-app.vercel.app
# → Valide 24h en staging

git checkout main
git merge develop
git push origin main
# → Vercel déploy sur: https://lachattefc-app.vercel.app (PROD)
```

---

## URLs

| Env | URL | Source |
|-----|-----|--------|
| **Prod App** | https://lachattefc-app.vercel.app | main branch |
| **Staging App** | https://staging-lachattefc-app.vercel.app | develop branch |
| **Preview App** | https://lachattefc-app-git-feature-xxx.vercel.app | feature/* branch |
| **Prod Admin** | https://lachattefc-admin.vercel.app | main branch |
| **Staging Admin** | https://staging-lachattefc-admin.vercel.app | develop branch |

---

## Safety

✅ Main branch = Production (protect with branch rules)
✅ Develop branch = Staging (test 24h avant prod)
✅ Feature branches = Previews (test pendant dev)

Rien ne peut push à main sans review!

---

## Vercel Branch Aliases (optionnel)

Renommer les URLs pour staging:

```yaml
# vercel.json (root)
{
  "buildCommand": "npm run build",
  "branches": [
    {
      "name": "develop",
      "alias": "staging-lachattefc-app.vercel.app"
    },
    {
      "name": "main",
      "alias": "lachattefc-app.vercel.app"
    }
  ]
}
```

Mais c'est optionnel - URLs by défaut marchent très bien.

---

## À Tester

1. Crée branche: `git checkout -b test/staging`
2. Modifie un fichier (ex: titre page)
3. Push: `git push origin test/staging`
4. Vérifie Vercel crée preview
5. Ouvre https://lachattefc-app-git-test-staging.vercel.app
6. Vois ta modif
7. Supprime branche: `git push origin --delete test/staging`
8. Vérifie preview s'auto-supprime en 24h

