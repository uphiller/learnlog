import Keycloak from "keycloak-js";

const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL || "https://auth.bettercodelab.com",
  realm: import.meta.env.VITE_KEYCLOAK_REALM || "board",
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || "board-spa",
});

export default keycloak;
