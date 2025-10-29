import app from "./api/app";
import serverless from "serverless-http";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default serverless(app);
