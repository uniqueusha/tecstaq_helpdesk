const pool = require('../../db');
const xlsx = require("xlsx");
const fs = require("fs");
const path = require('path');

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

// add Priority...
const addPriority = async (req, res) => {
    const name = req.body.name ? req.body.name.trim() : '';
    const response_time_hrs = req.body.response_time_hrs ? req.body.response_time_hrs :'';
    const resolution_time_hrs = req.body.resolution_time_hrs ? req.body.resolution_time_hrs :'';
    
    if (!name) {
        return error422("Name is required.", res);
    }

    //check Priority already exists or not
    const isExistPriorityQuery = `SELECT * FROM priorities WHERE name = ? `;
    const isExistPriorityResult = await pool.query(isExistPriorityQuery, [name]);
    if (isExistPriorityResult[0].length > 0) {
        return error422("Priority is already exists.", res);
    }

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        //insert into priority
        const insertPriorityQuery = `INSERT INTO priorities (name, response_time_hrs, resolution_time_hrs ) VALUES (?, ?, ?)`;
        const insertPriorityValues = [name, response_time_hrs, resolution_time_hrs];
        const priorityResult = await connection.query(insertPriorityQuery, insertPriorityValues);

        // Commit the transaction
        await connection.commit();
        res.status(200).json({
            status: 200,
            message: "Priority added successfully",
        });
    } catch (error) {
        console.log(error);
        
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
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

// get priority by id...
const getPriority = async (req, res) => {
    const priorityId = parseInt(req.params.id);

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        const priorityQuery = `SELECT * FROM priorities 
        WHERE priority_id = ?`;
        const priorityResult = await connection.query(priorityQuery, [priorityId]);

        if (priorityResult[0].length == 0) {
            return error422("Priority Not Found.", res);
        }
        const priority = priorityResult[0][0];

        return res.status(200).json({
            status: 200,
            message: "Priority Retrived Successfully",
            data: priority
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

//priority  update...
const updatePriority = async (req, res) => {
    const priorityId = parseInt(req.params.id);
    const name = req.body.name ? req.body.name.trim() : '';
    const response_time_hrs = req.body.response_time_hrs ? req.body.response_time_hrs :'';
    const resolution_time_hrs = req.body.resolution_time_hrs ? req.body.resolution_time_hrs :'';

    if (!name) {
        return error422("Priority name is required.", res);
    }

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        // Check if status exists
        const priorityQuery = "SELECT * FROM priorities WHERE priority_id  = ?";
        const priorityResult = await connection.query(priorityQuery, [priorityId]);
        if (priorityResult[0].length == 0) {
            return error422("Priority Not Found.", res);
        }
        // Check if the provided Priority exists and is active 
        const existingPriorityQuery = "SELECT * FROM priorities WHERE name  = ? AND priority_id !=?";
        const existingPriorityResult = await connection.query(existingPriorityQuery, [name, priorityId]);

        if (existingPriorityResult[0].length > 0) {
            return error422("Priority already exists.", res);
        }

        // Update the Priority record with new data
        const updateQuery = `
            UPDATE priorities
            SET name = ?, response_time_hrs = ?, resolution_time_hrs = ?
            WHERE priority_id = ?
        `;

        await connection.query(updateQuery, [name, response_time_hrs, resolution_time_hrs, priorityId]);
        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "Priority updated successfully.",
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

//status change of priority...
const onStatusChange = async (req, res) => {
    const priorityId = parseInt(req.params.id);
    const status = parseInt(req.query.status); // Validate and parse the status parameter

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        // Check if the priority exists
        const priorityQuery = "SELECT * FROM priorities WHERE priority_id = ?";
        const priorityResult = await connection.query(priorityQuery, [priorityId]);

        if (priorityResult[0].length == 0) {
            return res.status(404).json({
                status: 404,
                message: "Priority not found.",
            });
        }

        // Validate the status parameter
        if (status !== 0 && status !== 1) {
            return res.status(400).json({
                status: 400,
                message: "Invalid status value. Status must be 0 (inactive) or 1 (active).",
            });
        }

        // Soft update the priority
        const updateQuery = `
            UPDATE priorities
            SET status = ?
            WHERE priority_id = ?
        `;

        await connection.query(updateQuery, [status, priorityId]);

        const statusMessage = status === 1 ? "activated" : "deactivated";
        // Commit the transaction
        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: `Priority ${statusMessage} successfully.`,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
};

//Priority download
const getPriorityDownload = async (req, res) => {

    const { key } = req.query;

    let connection = await getConnection();
    try {
        await connection.beginTransaction();

        let getPriorityQuery = `SELECT * FROM priorities
        WHERE 1 AND status = 1`;

        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            getPriorityQuery += ` AND (LOWER(name) LIKE '%${lowercaseKey}%')`;
        }

        getPriorityQuery += " ORDER BY cts DESC";

        let result = await connection.query(getPriorityQuery);
        let priority = result[0];

        if (priority.length === 0) {
            return error422("No data found.", res);
        }


        priority = priority.map((item, index) => ({
            "Sr No": index + 1,
            "Create Date": item.cts,
            "Name":item.name,
            "Response Time ": item.response_time_hrs,
            "Resolution Time ": item.resolution_time_hrs

            // "Status": item.status === 1 ? "activated" : "deactivated",
        }));

        // Create a new workbook
        const workbook = xlsx.utils.book_new();

        // Create a worksheet and add only required columns
        const worksheet = xlsx.utils.json_to_sheet(priority);

        // Add the worksheet to the workbook
        xlsx.utils.book_append_sheet(workbook, worksheet, "PriorityInfo");

        // Create a unique file name
        const excelFileName = `exported_data_${Date.now()}.xlsx`;

        // Write the workbook to a file
        xlsx.writeFile(workbook, excelFileName);

        // Send the file to the client
        res.download(excelFileName, (err) => {
            if (err) {
                res.status(500).send("Error downloading the file.");
            } else {
                fs.unlinkSync(excelFileName);
            }
        });

        await connection.commit();
    } catch (error) {
      console.log(error);
      
        return error500(error, res);
    } finally {
        if (connection) connection.release();
    }
};

module.exports = {
    addPriority,
    getAllPriorities,
    getPriorityWma,
    updatePriority,
    onStatusChange,
    getPriority,
    getPriorityDownload
    
}