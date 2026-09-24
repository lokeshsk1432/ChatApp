import axios from "axios";
export const baseURL = "https://chatnest-app.duckdns.org";
export const httpClient = axios.create({
    baseURL : baseURL,
});