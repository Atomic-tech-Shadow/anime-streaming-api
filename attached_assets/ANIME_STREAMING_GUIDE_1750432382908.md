# Guide d'utilisation - Page Streaming Anime

## 🎯 Fonctionnalités implémentées

### ✅ Interface identique à anime-sama.fr
- Fond noir avec cartes bleues pour les sagas
- Drapeaux VF/VOSTFR avec émojis 🇫🇷 🇯🇵
- Sélecteurs dropdown style anime-sama
- Navigation avec boutons ronds bleus
- Lecteur vidéo iframe responsive

### ✅ Navigation exacte
1. **Recherche** - Tapez le nom d'un anime
2. **Sélection** - Cliquez sur un anime dans les résultats
3. **Sagas** - Choisissez une saison/saga dans les cartes bleues
4. **Langue** - Sélectionnez VF ou VOSTFR
5. **Épisode** - Choisissez l'épisode dans le dropdown
6. **Lecteur** - Sélectionnez le serveur de streaming
7. **Visionnage** - Le lecteur se lance automatiquement

### ✅ API connectée
- URL: `https://api-anime-sama.onrender.com`
- Endpoints utilisés:
  - `/api/search?query={anime}`
  - `/api/anime/{id}`
  - `/api/seasons?animeId={id}&season={num}&language={lang}`
  - `/api/episode/{episodeId}`

## 🚀 Comment tester

### Depuis l'application
1. Connectez-vous à votre compte
2. Cliquez sur "Anime Streaming" (bouton rouge-orange)
3. Recherchez un anime populaire comme:
   - "naruto"
   - "one piece" 
   - "demon slayer"
   - "attack on titan"

### Flux de test complet
1. **Recherche**: Tapez "naruto" dans la barre de recherche
2. **Attente**: Les résultats s'affichent automatiquement
3. **Sélection**: Cliquez sur l'anime Naruto
4. **Navigation**: Vous arrivez sur la page de détails
5. **Saga**: Cliquez sur "Saga 1 (East Blue)" par exemple
6. **Langue**: Choisissez VF ou VOSTFR
7. **Épisode**: Sélectionnez "EPISODE 1" dans le dropdown
8. **Lecteur**: Choisissez "LECTEUR 1" 
9. **Streaming**: Le lecteur vidéo se lance

## 🎮 Contrôles disponibles

### Navigation épisodes
- **← Bouton précédent**: Épisode précédent
- **🔄 Bouton reload**: Recharger les sources
- **→ Bouton suivant**: Épisode suivant

### Changement de serveur
- Utilisez le dropdown "LECTEUR 1, 2, 3..." pour changer de serveur
- Message affiché: "Pub insistante ou vidéo indisponible ? Changez de lecteur."

### Responsive mobile
- Optimisé pour écrans 360px et plus
- Boutons de 45px de hauteur minimum
- Lecteur vidéo adaptatif (h-64 à h-96)

## 🔧 Configuration technique

### Format des données API
```json
{
  "success": true,
  "data": {
    "id": "naruto",
    "title": "Naruto",
    "image": "https://...",
    "seasons": [
      {
        "number": 1,
        "name": "Saga 1 (East Blue)",
        "languages": ["VF", "VOSTFR"]
      }
    ]
  }
}
```

### Sources vidéo
```json
{
  "sources": [
    {
      "url": "https://...",
      "server": "Vidmoly",
      "quality": "HD",
      "language": "VOSTFR"
    }
  ]
}
```

## 🐛 Dépannage

### Si la recherche ne fonctionne pas
- Vérifiez que votre API Render est déployée
- Testez l'endpoint directement: `https://api-anime-sama.onrender.com/api/search?query=naruto`

### Si les épisodes ne se chargent pas
- Vérifiez le format des IDs d'épisodes dans votre API
- Format attendu: `{animeId}-episode-{number}-{language}`

### Si le lecteur ne fonctionne pas
- Problème possible avec les URLs de streaming
- Changez de lecteur avec le dropdown

## 🔗 Accès rapide
- Page accessible via: `/streaming`
- Bouton "Anime Streaming" sur la page d'accueil
- Interface sans authentification requise pour le streaming

La page reproduit fidèlement l'expérience anime-sama.fr avec votre API réelle.