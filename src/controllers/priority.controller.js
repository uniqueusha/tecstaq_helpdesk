const pool = require('../../db');

// Function to obtain a database connection
const getConnection = async () => {
    try {
        const connection = await pool.getConnection();
        return connection;
    } catch (error) {
        throw new Error("Failed to obtain database connection: " + error.message);
    }
};

//errror 422 handler...
error422 = (message, res) => {
    return res.status(422).json({
        status: 422,
        message: message
    });
}

//error 500 handler...
error500 = (error, res) => {
    return res.status(500).json({
        status: 500,
        message: "Internal Server Error",
        error: error
    });
}



// get Priority list...
const getAllPriorities = async (req, res) => {
    const { page, perPage, key } = req.query;

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        let getPriorityQuery = `SELECT * FROM priorities WHERE 1`;

        let countQuery = `SELECT COUNT(*) AS total FROM priorities WHERE 1`;

        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            if (lowercaseKey === "activated") {
                getPriorityQuery += ` AND status = 1`;
                countQuery += ` AND status = 1`;
            } else if (lowercaseKey === "deactivated") {
                getPriorityQuery += ` AND status = 0`;
                countQuery += ` AND status = 0`;
            } else {
                getPriorityQuery += ` AND LOWER(priority) LIKE '%${lowercaseKey}%' `;
                countQuery += ` AND LOWER(priority) LIKE '%${lowercaseKey}%' `;
            }
        }
        getPriorityQuery += " ORDER BY cts DESC";

        // Apply pagination if both page and perPage are provided
        let total = 0;
        if (page && perPage) {
            const totalResult = await connection.query(countQuery);
            total = parseInt(totalResult[0][0].total);

            const start = (page - 1) * perPage;
            getPriorityQuery += ` LIMIT ${perPage} OFFSET ${start}`;
        }

        const result = await connection.query(getPriorityQuery);
        const priority = result[0];

        // Commit the transaction
        await connection.commit();
        const data = {
            status: 200,
            message: "Priority retrieved successfully",
            data: priority,
        };
        // Add pagination information if provided
        if (page && perPage) {
            data.pagination = {
                per_page: perPage,
                total: total,
                current_page: page,
                last_page: Math.ceil(total / perPage),
            };
        }

        return res.status(200).json(data);
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

//get Priority active...
const getPriorityWma = async (req, res) => {

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        const priorityQuery = `SELECT * FROM priorities WHERE status = 1 ORDER BY name`;

        const priorityResult = await connection.query(priorityQuery);
        const priority = priorityResult[0];

        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "Priority retrieved successfully.",
            data: priority,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

module.exports = {
    getAllPriorities,
    getPriorityWma,
    
}