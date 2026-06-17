declare global {
  namespace NodeJS {
    interface ProcessEnv {
      DOWNLOAD: int;
      SAVE_STATIC: int;
      USE_CERTIFICATES : int;
      PORT : string;
      SESSION_SECRET : CipherKey;
      DISCORD_TOKEN : string;
      CLIENT_ID : string;
      CLIENT_SECRET : string;
      API_KEY : string;
      ENDPOINT_PASSWORD : string;
      DATA_PATH : string;

      SITE_AUTH_URL : string;
      // fake 
      NODE_ENV: 'development' | 'production';
      PWD: string;
    }
  }
}

// If this file has no import/export statements (i.e. is a script)
// convert it into a module by adding an empty export statement.
export {}