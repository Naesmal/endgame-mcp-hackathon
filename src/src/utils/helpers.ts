import crypto from 'crypto';

/**
 * Génère un ID unique basé sur un préfixe et des données optionnelles
 * @param prefix Préfixe pour l'ID
 * @param data Données optionnelles pour le hachage
 * @returns ID unique
 */
export function generateId(prefix: string, data?: any): string {
  const timestamp = Date.now().toString();
  const randomValue = Math.random().toString();
  
  if (data) {
    const hash = crypto
      .createHash('sha256')
      .update(timestamp + randomValue + JSON.stringify(data))
      .digest('hex')
      .substring(0, 16);
    
    return `${prefix}_${hash}`;
  }
  
  return `${prefix}_${timestamp.substring(timestamp.length - 6)}_${randomValue.substring(2, 8)}`;
}

/**
 * Ajoute un délai dans l'exécution
 * @param ms Temps d'attente en millisecondes
 * @returns Promesse qui se résout après le délai
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Limite le nombre de caractères d'une chaîne
 * @param text Texte à limiter
 * @param maxLength Longueur maximale
 * @param suffix Suffixe à ajouter si la chaîne est tronquée
 * @returns Chaîne limitée
 */
export function truncateText(text: string, maxLength: number, suffix: string = '...'): string {
  if (text.length <= maxLength) {
    return text;
  }
  
  return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Convertit un objet en paramètres d'URL
 * @param params Objet de paramètres
 * @returns Chaîne de paramètres URL
 */
export function objectToURLParams(params: Record<string, any>): string {
  const urlParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      urlParams.append(key, String(value));
    }
  });
  
  return urlParams.toString();
}

/**
 * Parse une chaîne JSON avec gestion d'erreurs
 * @param jsonString Chaîne JSON à parser
 * @param defaultValue Valeur par défaut en cas d'erreur
 * @returns Objet parsé ou valeur par défaut
 */
export function safeJsonParse<T>(jsonString: string, defaultValue: T): T {
  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    return defaultValue;
  }
}