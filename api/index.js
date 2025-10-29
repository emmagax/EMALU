import app from "./app.js";
import serverless from "serverless-http";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default serverless(app);
