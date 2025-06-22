# Documentation des Erreurs - Analyse des Logs

## 🚨 Résumé des Problèmes Détectés

### 1. Erreurs JavaScript Non Gérées (unhandledrejection)

**Problème Principal**: Le navigateur rapporte de nombreuses `unhandledrejection` en continu, ce qui indique des promesses rejetées non capturées dans le code JavaScript.

**Fréquence**: ~1 erreur par seconde depuis le démarrage de l'application

**Impact**: 
- Performance dégradée du navigateur
- Expérience utilisateur perturbée
- Possible fuite mémoire
- Messages d'erreur masqués pour le débogage

### 2. Problèmes de Connexion Vite

**Symptômes**:
```
[vite] connecting...
[vite] server connection lost. Polling for restart...
```

**Cause**: Reconnexions fréquentes du serveur de développement Vite, probablement dues aux erreurs JavaScript non gérées.

## 🔍 Analyse Détaillée

### Erreurs `unhandledrejection`

Ces erreurs se produisent quand:
1. Une promesse est rejetée (Promise.reject() ou throw dans async)
2. Aucun `.catch()` n'est attaché pour gérer l'erreur
3. Aucun gestionnaire global `window.addEventListener('unhandledrejection')` n'est défini

### Sources Probables dans l'Application Anime Sama

#### 1. Appels API Non Protégés
```typescript
// ❌ PROBLÉMATIQUE - Sans gestion d'erreur
fetch(`${API_BASE}/api/search?query=${query}`)
  .then(response => response.json())
  .then(data => setResults(data));

// ✅ SOLUTION - Avec gestion d'erreur
fetch(`${API_BASE}/api/search?query=${query}`)
  .then(response => response.json())
  .then(data => setResults(data))
  .catch(error => {
    console.error('Erreur API:', error);
    setError('Erreur de recherche');
  });
```

#### 2. Async/Await Sans Try-Catch
```typescript
// ❌ PROBLÉMATIQUE
const loadData = async () => {
  const response = await fetch(url);
  const data = await response.json();
  setData(data);
};

// ✅ SOLUTION
const loadData = async () => {
  try {
    const response = await fetch(url);
    const data = await response.json();
    setData(data);
  } catch (error) {
    console.error('Erreur:', error);
    setError('Impossible de charger les données');
  }
};
```

#### 3. Timeouts et AbortController Non Gérés
```typescript
// ❌ PROBLÉMATIQUE - AbortController sans gestion
const controller = new AbortController();
setTimeout(() => controller.abort(), 5000);
fetch(url, { signal: controller.signal }); // Peut lever AbortError

// ✅ SOLUTION
try {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  const response = await fetch(url, { signal: controller.signal });
  clearTimeout(timeoutId);
  return response;
} catch (error) {
  if (error.name === 'AbortError') {
    console.log('Requête annulée par timeout');
  } else {
    console.error('Erreur réseau:', error);
  }
  throw error;
}
```

## 🛠️ Solutions Recommandées

### 1. Gestionnaire Global d'Erreurs
Ajouter dans `client/src/main.tsx` ou `index.html`:
```typescript
// Gestionnaire global pour les promesses rejetées
window.addEventListener('unhandledrejection', event => {
  console.error('Promesse rejetée non gérée:', event.reason);
  
  // Optionnel: Empêcher l'affichage de l'erreur dans la console
  event.preventDefault();
  
  // Reporter l'erreur à un service de monitoring
  // reportError(event.reason);
});

// Gestionnaire pour les erreurs JavaScript générales
window.addEventListener('error', event => {
  console.error('Erreur JavaScript:', event.error);
});
```

### 2. Wrapper de Fetch Sécurisé
```typescript
class SafeApiClient {
  private async safeFetch(url: string, options?: RequestInit): Promise<Response> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Requête expirée (timeout)');
        }
        throw new Error(`Erreur réseau: ${error.message}`);
      }
      throw new Error('Erreur inconnue');
    }
  }
  
  async get<T>(url: string): Promise<T> {
    const response = await this.safeFetch(url);
    return response.json();
  }
  
  async post<T>(url: string, data: any): Promise<T> {
    const response = await this.safeFetch(url, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return response.json();
  }
}

const apiClient = new SafeApiClient();
export default apiClient;
```

### 3. Hook React pour Gestion d'Erreurs
```typescript
import { useState, useCallback } from 'react';

interface UseAsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  execute: (asyncFunction: () => Promise<T>) => Promise<void>;
  reset: () => void;
}

export function useAsync<T>(): UseAsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const execute = useCallback(async (asyncFunction: () => Promise<T>) => {
    try {
      setLoading(true);
      setError(null);
      const result = await asyncFunction();
      setData(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      console.error('Erreur async:', err);
    } finally {
      setLoading(false);
    }
  }, []);
  
  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);
  
  return { data, loading, error, execute, reset };
}

// Usage
const MyComponent = () => {
  const { data, loading, error, execute } = useAsync<SearchResult[]>();
  
  const searchAnimes = useCallback(() => {
    execute(async () => {
      const response = await fetch(`/api/search?query=${query}`);
      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      return result.data;
    });
  }, [query, execute]);
  
  return (
    <div>
      {loading && <p>Chargement...</p>}
      {error && <p>Erreur: {error}</p>}
      {data && <SearchResults results={data} />}
    </div>
  );
};
```

### 4. Corrections Spécifiques pour anime-sama.tsx

#### A. Protection des Appels API
```typescript
// Dans detectAvailableLanguages
const detectAvailableLanguages = async (animeId: string, seasonNumber: number): Promise<('VF' | 'VOSTFR')[]> => {
  const languages: ('VF' | 'VOSTFR')[] = [];
  
  const testLanguage = async (lang: 'vf' | 'vostfr'): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(
        `${API_BASE}/api/seasons?animeId=${animeId}&season=${seasonNumber}&language=${lang}`,
        { signal: controller.signal }
      );
      
      clearTimeout(timeoutId);
      
      if (!response.ok) return false;
      
      const data = await response.json();
      return data.success && data.data.episodes.length > 0;
    } catch (error) {
      // Gestion spécifique des erreurs
      if (error instanceof Error && error.name === 'AbortError') {
        console.log(`Timeout pour la langue ${lang}`);
      } else {
        console.log(`Erreur test langue ${lang}:`, error);
      }
      return false;
    }
  };
  
  // Test des langues en parallèle avec gestion d'erreur
  const [vfAvailable, vostfrAvailable] = await Promise.allSettled([
    testLanguage('vf'),
    testLanguage('vostfr')
  ]);
  
  if (vfAvailable.status === 'fulfilled' && vfAvailable.value) {
    languages.push('VF');
  }
  
  if (vostfrAvailable.status === 'fulfilled' && vostfrAvailable.value) {
    languages.push('VOSTFR');
  }
  
  return languages;
};
```

#### B. Gestion des UseEffect
```typescript
// Protection contre les race conditions dans useEffect
useEffect(() => {
  let cancelled = false;
  
  const searchWithDelay = async () => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    const timeoutId = setTimeout(async () => {
      if (searchQuery.trim() && currentView === 'search' && !cancelled) {
        try {
          await searchAnimes(searchQuery);
        } catch (error) {
          if (!cancelled) {
            console.error('Erreur recherche:', error);
            setError('Erreur lors de la recherche');
          }
        }
      }
    }, 800);
    
    setSearchTimeout(timeoutId);
  };
  
  searchWithDelay();
  
  return () => {
    cancelled = true;
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
  };
}, [searchQuery, currentView]);
```

## 📊 Monitoring et Debugging

### 1. Console.log Sécurisé
```typescript
class Logger {
  static error(message: string, error?: any) {
    console.error(`[ERROR] ${message}`, error);
    // Optionnel: Envoyer à un service de monitoring
  }
  
  static warn(message: string, data?: any) {
    console.warn(`[WARN] ${message}`, data);
  }
  
  static info(message: string, data?: any) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[INFO] ${message}`, data);
    }
  }
}
```

### 2. Métriques d'Erreurs
```typescript
class ErrorTracker {
  private static errorCounts = new Map<string, number>();
  
  static track(errorType: string, error: any) {
    const count = this.errorCounts.get(errorType) || 0;
    this.errorCounts.set(errorType, count + 1);
    
    Logger.error(`${errorType} (${count + 1}e occurrence)`, error);
    
    // Alerte si trop d'erreurs du même type
    if (count > 5) {
      Logger.error(`ALERTE: Plus de 5 erreurs de type ${errorType}`);
    }
  }
  
  static getStats() {
    return Object.fromEntries(this.errorCounts);
  }
}
```

## 🎯 Actions Prioritaires

### Immédiat (Critique)
1. ✅ Ajouter un gestionnaire global `unhandledrejection`
2. ✅ Protéger tous les appels `fetch()` avec try-catch
3. ✅ Corriger les timeouts AbortController

### Court terme (Important)
1. Remplacer les appels API directs par le wrapper sécurisé
2. Ajouter le hook `useAsync` pour les composants React
3. Implémenter le système de logging centralisé

### Moyen terme (Préventif)
1. Ajouter des tests unitaires pour les fonctions async
2. Implémenter un service de monitoring d'erreurs
3. Créer un système d'alertes pour les erreurs critiques

## 🔧 Outils de Debug Recommandés

### 1. Extension Chrome DevTools
- **React Developer Tools**: Pour inspecter les états React
- **Network Tab**: Pour voir les requêtes API échouées
- **Console**: Filtrer par "unhandledrejection"

### 2. Configuration Vite pour Debug
```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  server: {
    open: true,
    // Désactiver les erreurs overlay en dev si nécessaire
    hmr: {
      overlay: false
    }
  },
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development')
  }
});
```

Cette documentation fournit une analyse complète des erreurs détectées et des solutions concrètes pour résoudre les problèmes de promesses non gérées dans l'application Anime Sama.