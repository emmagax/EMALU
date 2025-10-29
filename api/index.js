import express from "express";
import serverless from "serverless-http";
import app from "./app.js";

const expressApp = express();
expressApp.use(app);

export const config = {
  api: {
    bodyParser: false,
  },
};

export default serverless(expressApp);
