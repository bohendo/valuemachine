import express from "express";

const port = 8080;

const app = express();
app.use(express.json());

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
