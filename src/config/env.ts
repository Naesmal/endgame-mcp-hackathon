import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';
import fs from 'fs';

// Fonction pour log sécurisé qui évite de perturber la communication JSON
function safeLog(message: string) {
  // Utiliser stderr au lieu de console.log pour ne pas interférer avec la communication JSON
  process.stderr.write(`${message}\n`);
}

// Chercher le fichier .env dans le répertoire parent de src
const envPath = path.resolve(__dirname, '../../.env');
safeLog(`Tentative de chargement du fichier .env depuis: ${envPath}`);

// Vérifier si le fichier existe
if (!fs.existsSync(envPath)) {
  safeLog(`Avertissement: Le fichier .env n'existe pas à l'emplacement: ${envPath}`);
  safeLog('Tentative de chargement depuis le répertoire courant...');
}

// Charger explicitement depuis ce chemin
const result = dotenv.config({ path: envPath });
if (result.error) {
  safeLog(`Erreur lors du chargement du fichier .env: ${result.error.message}`);
  
  // Tentative de chargement depuis le répertoire courant
  const fallbackResult = dotenv.config();
  if (fallbackResult.error) {
    safeLog(`Impossible de charger le fichier .env depuis le répertoire courant: ${fallbackResult.error.message}`);
  } else {
    safeLog('Fichier .env chargé avec succès depuis le répertoire courant');
  }
} else {
  safeLog('Fichier .env chargé avec succès');
}

// Le reste de votre code...
const MasaMode = z.enum(['API', 'PROTOCOL']);
type MasaMode = z.infer<typeof MasaMode>;

// Normaliser les clés d'API (pour gérer les variantes avec ou sans "S")
if (process.env.TAO_STATS_API_KEY && !process.env.TAO_STAT_API_KEY) {
  process.env.TAO_STAT_API_KEY = process.env.TAO_STATS_API_KEY;
  safeLog('Variante TAO_STATS_API_KEY détectée et assignée à TAO_STAT_API_KEY');
}

// Schéma de validation des variables d'environnement
const envSchema = z.object({
  // Configuration du mode - permettre API ou PROTOCOL avec PROTOCOL comme valeur par défaut
  MASA_MODE: MasaMode.optional().default('PROTOCOL'),
  
  // Configuration API
  MASA_API_KEY: z.string().optional(),
  MASA_API_BASE_URL: z.string().default('https://api1.dev.masalabs.ai'),
  
  // Configuration Protocol
  MASA_PROTOCOL_NODE_URL: z.string().default('http://localhost:8080'),
  
  // Configuration du serveur MCP
  MCP_SERVER_NAME: z.string().default('Masa Subnet 42 Data Provider'),
  MCP_SERVER_VERSION: z.string().default('1.0.0'),
  MCP_SERVER_DESCRIPTION: z.string().default('Provides data access to Masa Subnet 42 resources'),
  MCP_TRANSPORT_TYPE: z.enum(['stdio', 'http']).default('stdio'),
  MCP_HTTP_PORT: z.string().transform(val => parseInt(val)).optional(),
  MCP_HTTP_HOST: z.string().default('localhost'),
  
  // Configuration des logs
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // Configuration TAO_STATS pour Bittensor
  TAO_STAT_API_KEY: z.string().optional(),
  TAO_STATS_API_KEY: z.string().optional(),
  TAO_STAT_MINUTE_LIMIT: z.string().transform(val => parseInt(val) || 5).optional()
});

// Modifier la fonction getEnv() pour ajouter la validation conditionnelle
export function getEnv() {
  try {
    // Valider les variables d'environnement
    const env = envSchema.parse(process.env);
    
    // Vérification conditionnelle pour s'assurer que MASA_API_KEY est présent en mode API
    if (env.MASA_MODE === 'API' && !env.MASA_API_KEY) {
      throw new Error('MASA_API_KEY is required when MASA_MODE is set to API');
    }
    
    return env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      safeLog(`Invalid environment variables: ${JSON.stringify(error.format(), null, 2)}`);
    } else if (error instanceof Error) {
      safeLog(`Error validating environment variables: ${error.message}`);
    } else {
      safeLog('Unknown error validating environment variables');
    }
    process.exit(1);
  }
}

// Exporter le type pour les variables d'environnement
export type Env = z.infer<typeof envSchema>;

// Exporter les variables d'environnement validées
export const env = getEnv();

// Fonction utilitaire pour vérifier si Bittensor est activé
export function isBittensorEnabled(): boolean {
  // Retourne true si l'une des clés API est présente
  return Boolean(env.TAO_STAT_API_KEY || env.TAO_STATS_API_KEY);
}

// Exporter le type pour le mode
export { MasaMode };