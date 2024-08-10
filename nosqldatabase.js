// Import DynamoDB client from AWS SDK
const { DynamoDBClient, PutItemCommand, GetItemCommand } = require("@aws-sdk/client-dynamodb");

// Initialize DynamoDB client
const client = new DynamoDBClient({
    region: "us-east-1",
});

// Function to add an item to DynamoDB
const addItem = async (item) => {
    const params = {
        TableName: "nosqldatabase", // Replace with your table name
        Item: {
            'sub-engage': { S: item.subEngage }, // Correctly specify attribute types
            name: { S: item.name }, // Correctly specify attribute types
        },
    };

    try {
        const command = new PutItemCommand(params);
        const data = await client.send(command);
        console.log("Item added successfully:", data);
    } catch (err) {
        console.error("Error adding item:", err);
    }
};

// Function to get an item from DynamoDB
const getItem = async (subEngage) => {
    const params = {
        TableName: "nosqldatabase", // Replace with your table name
        Key: {
            'sub-engage': { S: subEngage }, // Correctly specify attribute types and key name
        },
    };

    try {
        const command = new GetItemCommand(params);
        const data = await client.send(command);
        if (data.Item) {
            console.log("Item retrieved:", data.Item);
        } else {
            console.log("Item not found.");
        }
    } catch (err) {
        console.error("Error retrieving item:", err);
    }
};

// Example usage
addItem({ subEngage: "001", name: "John" }); // Updated name
getItem("001");
