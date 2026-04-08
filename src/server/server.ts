import express from "express";
import cors from "cors";
import { join } from "path";
const app = express();
app.use(cors());
const staticPath = join(process.cwd(), "public");
console.log(`Serving static files from ${staticPath}`);
app.use(express.static(staticPath));
const PORT = process.env.PORT || 3000;
app.listen(PORT, (error) => {
    if (error) {
        console.log(error);
        return;
    }
    console.log(`Server is running http://localhost:${PORT}`);
});