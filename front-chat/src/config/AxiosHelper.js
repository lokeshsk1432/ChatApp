import axios from "axios";
export const baseURL = "http://13.62.80.246:8080";
export const httpClient = axios.create({
    baseURL : baseURL,
});