const express = require('express')
const app = express()
const port = process.env.PORT || 5000;
const cors = require('cors')

require('dotenv').config()
app.use(cors())
app.use(express.json())

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const uri = `${process.env.DB_URI}`

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

app.get('/', (req, res) => {
    res.send('Baby Name Blessing Server is running')
})

async function run() {
    try {
        const namesCollection = client.db("babyname").collection("names");
        const usersCollection = client.db("babyname").collection("users");
        const affiliatesCollection = client.db("babyname").collection("affiliates");



        // Affiliate endpoints
        app.post("/affiliates", async (req, res) => {
            const { title, imageLink, productLink, description } = req.body;

            if (!title || !imageLink || !productLink || !description) {
                return res.status(400).send({ message: "All fields are required" });
            }

            try {
                const newAffiliate = {
                    title,
                    imageLink,
                    productLink,
                    description,
                    status: false,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };

                const result = await affiliatesCollection.insertOne(newAffiliate);
                return res.status(201).send({
                    message: "Affiliate added successfully",
                    insertedId: result.insertedId,
                    affiliate: newAffiliate
                });
            } catch (error) {
                return res.status(500).send({ message: "Internal server error" });
            }
        });

        app.get("/affiliates", async (req, res) => {
            try {
                const result = await affiliatesCollection.find().sort({ _id: -1 }).toArray();
                return res.status(200).send(result);
            } catch (error) {
                return res.status(500).send({ message: "Internal server error" });
            }
        });

        app.put("/affiliates/:id", async (req, res) => {
            const { id } = req.params;
            const { title, imageLink, productLink, description } = req.body;

            if (!ObjectId.isValid(id)) {
                return res.status(400).send({ message: "Invalid ID format" });
            }

            if (!title || !imageLink || !productLink || !description) {
                return res.status(400).send({ message: "All fields are required" });
            }

            try {
                const updatedAffiliate = {
                    title,
                    imageLink,
                    productLink,
                    description,
                    status: false,
                    updatedAt: new Date()
                };

                const result = await affiliatesCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: updatedAffiliate }
                );

                if (result.modifiedCount === 0) {
                    return res.status(400).send({ message: "No changes made" });
                }

                return res.status(200).send({
                    message: "Affiliate updated successfully",
                    affiliate: updatedAffiliate
                });
            } catch (error) {
                return res.status(500).send({ message: "Internal server error" });
            }
        });


        app.put("/affiliates/active/:id", async (req, res) => {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
        return res.status(400).send({ message: "Invalid ID format" });
    }

    try {
        // Step 1: Set all statuses to false
        await affiliatesCollection.updateMany({}, { $set: { status: false } });

        // Step 2: Set status to true for the selected affiliate
        const result = await affiliatesCollection.updateOne(
            { _id: new ObjectId(id) },
            { $set: { status: true } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).send({ message: "Affiliate not found" });
        }

        return res.status(200).send({
            message: "Affiliate status updated successfully",
            activeAffiliateId: id
        });
    } catch (error) {
        return res.status(500).send({ message: "Internal server error", error });
    }
});



        app.delete("/affiliates/:id", async (req, res) => {
            const { id } = req.params;

            if (!ObjectId.isValid(id)) {
                return res.status(400).send({ message: "Invalid ID format" });
            }

            try {
                const result = await affiliatesCollection.deleteOne({ _id: new ObjectId(id) });

                if (result.deletedCount === 1) {
                    return res.status(200).send({ message: "Affiliate deleted successfully" });
                } else {
                    return res.status(404).send({ message: "Affiliate not found" });
                }
            } catch (error) {
                return res.status(500).send({ message: "Internal server error" });
            }
        });

        // User API endpoints
        app.post("/users", async (req, res) => {
            const { name, email } = req.body;

            if (!email || !name) {
                return res.status(400).send({ message: "Name and email are required." });
            }

            try {
                const existingUser = await usersCollection.findOne({ email });

                if (existingUser) {
                    return res.status(200).send({ message: "User already exists." });
                }

                const result = await usersCollection.insertOne({
                    name,
                    email,
                    role: 'user',
                    createdAt: new Date()
                });
                return res.status(201).send({ message: "User created successfully", insertedId: result.insertedId });
            } catch (error) {
                return res.status(500).send({ message: "Internal server error" });
            }
        });

        // Get all users
        app.get("/users", async (req, res) => {
            try {
                const result = await usersCollection.find().sort({ _id: -1 }).toArray();
                return res.status(200).send(result);
            } catch (error) {
                return res.status(500).send({ message: "Internal server error" });
            }
        });

        app.get("/users/email/:email", async (req, res) => {
            const email = req.params.email;

            try {
                const result = await usersCollection.findOne({ email });
                if (!result) {
                    return res.status(404).send({ message: "User not found" });
                }
                return res.status(200).send(result);
            } catch (error) {
                return res.status(500).send({ message: "Internal server error" });
            }
        });




        // Make user admin
        app.put("/users/make-admin/:id", async (req, res) => {
            const { id } = req.params;

            if (!ObjectId.isValid(id)) {
                return res.status(400).send({ message: "Invalid ID format" });
            }

            try {
                const result = await usersCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: { role: "admin", updatedAt: new Date() } }
                );

                if (result.modifiedCount === 0) {
                    return res.status(400).send({ message: "User not found or already admin" });
                }

                return res.status(200).send({ message: "User role updated to admin" });
            } catch (error) {
                return res.status(500).send({ message: "Internal server error" });
            }
        });

        // Remove admin role
        app.put("/users/remove-admin/:id", async (req, res) => {
            const { id } = req.params;

            if (!ObjectId.isValid(id)) {
                return res.status(400).send({ message: "Invalid ID format" });
            }

            try {
                const result = await usersCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: { role: "user", updatedAt: new Date() } }
                );

                if (result.modifiedCount === 0) {
                    return res.status(400).send({ message: "User not found or not an admin" });
                }

                return res.status(200).send({ message: "Admin role removed successfully" });
            } catch (error) {
                return res.status(500).send({ message: "Internal server error" });
            }
        });

        // Name API endpoints
        app.get("/names", async (req, res) => {
            try {
                const result = await namesCollection.find().toArray();
                console.log("Fetched names:", result);
                return res.send(result);
            } catch (error) {
                return res.status(500).send({ message: "Internal server error razzak" });
            }
        });

        app.post("/names", async (req, res) => {
            const { name, meaning, scripture, theme } = req.body;

            if (!name || !meaning) {
                return res.status(400).send({ message: "Required fields are missing" });
            }

            try {
                // Check if name already exists
                const existingName = await namesCollection.findOne({ name });
                if (existingName) {
                    return res.status(400).send({ message: "Name already exists" });
                }

                const newName = {
                    name,
                    meaning,
                    scripture: scripture || "",
                    theme: theme || "",
                    createdAt: new Date(),
                    updatedAt: new Date()
                };

                const result = await namesCollection.insertOne(newName);
                return res.status(201).send({
                    message: "Name added successfully",
                    insertedId: result.insertedId,
                    name: newName
                });
            } catch (error) {
                return res.status(500).send({ message: "Internal server error " });
            }
        });

        app.put("/names/:id", async (req, res) => {
            const { id } = req.params;
            const { name, meaning, scripture, theme } = req.body;

            if (!ObjectId.isValid(id)) {
                return res.status(400).send({ message: "Invalid ID format" });
            }

            if (!name || !meaning) {
                return res.status(400).send({ message: "Required fields are missing" });
            }

            try {
                const existingName = await namesCollection.findOne({ _id: new ObjectId(id) });
                if (!existingName) {
                    return res.status(404).send({ message: "Name not found" });
                }

                // Check if the new name conflicts with another name (excluding current one)
                const nameConflict = await namesCollection.findOne({
                    name,
                    _id: { $ne: new ObjectId(id) }
                });
                if (nameConflict) {
                    return res.status(400).send({ message: "Name already exists" });
                }

                const updatedName = {
                    name,
                    meaning,
                    scripture: scripture || "",
                    theme: theme || "",
                    updatedAt: new Date()
                };

                const result = await namesCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: updatedName }
                );

                if (result.modifiedCount === 0) {
                    return res.status(400).send({ message: "No changes made" });
                }

                return res.status(200).send({
                    message: "Name updated successfully",
                    name: updatedName
                });
            } catch (error) {
                return res.status(500).send({ message: "Internal server error" });
            }
        });

        app.delete("/names/:id", async (req, res) => {
            const { id } = req.params;

            if (!ObjectId.isValid(id)) {
                return res.status(400).send({ message: "Invalid ID format" });
            }

            try {
                const existingName = await namesCollection.findOne({ _id: new ObjectId(id) });
                if (!existingName) {
                    return res.status(404).send({ message: "Name not found" });
                }

                const result = await namesCollection.deleteOne({ _id: new ObjectId(id) });
                if (result.deletedCount === 1) {
                    return res.status(200).send({ message: "Name deleted successfully" });
                } else {
                    return res.status(400).send({ message: "Failed to delete name" });
                }
            } catch (error) {
                return res.status(500).send({ message: "Internal server error" });
            }
        });

    } finally {
        // await client.close();
    }
}
run().catch(console.dir);

app.listen(port, () => {
    console.log(`Baby Name Blessing server listening on port ${port}`)
})