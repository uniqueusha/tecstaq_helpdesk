const pool = require("../../db");
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
//error handle 422...
error422 = (message, res) => {
  return res.status(422).json({
    status: 422,
    message: message,
  });
};
//error handle 500...
error500 = (error, res) => {
  return res.status(500).json({
    status: 500,
    message: "Internal Server Error",
    error: error,
  });
};
//error 404 handler...
error404 = (message, res) => {
  return res.status(404).json({
    status: 404,
    message: message,
  });
};

//Create Ticket Categories
const createTicketCategories = async (req, res)=>{
    const parent_category = req.body.parent_category ? req.body.parent_category.trim() :'';
    const name = req.body.name ? req.body.name.trim() :'';
    const department_id  = req.body.department_id  ? req.body.department_id:'';
    const priority_id  = req.body.priority_id ? req.body.priority_id.trim() :'';
    const sla_hours = req.body.sla_hours ? req.body.sla_hours.trim() :'';
    const description = req.body.description ? req.body.description.trim():'';
    
    if (!name) {
        return error422("Name is required.", res);
    }  

    let connection = await getConnection();

    try {
        // start the transaction
        await connection.beginTransaction();

        // Check if department exists
        const departmentQuery = "SELECT * FROM departments WHERE department_id  = ?";
        const departmentResult = await connection.query(departmentQuery, [department_id]);
        if (departmentResult[0].length == 0) {
            return error422("Department Not Found.", res);
        }

        // Check if status exists
        const priorityQuery = "SELECT * FROM priorities WHERE priority_id  = ?";
        const priorityResult = await connection.query(priorityQuery, [priority_id]);
        if (priorityResult[0].length == 0) {
            return error422("Priority Not Found.", res);
        }

        const insertQuery = "INSERT INTO ticket_categories (parent_category, name, department_id, priority_id, sla_hours, description)VALUES(?, ?, ?, ?, ?, ?)";
        const result = await connection.query(insertQuery,[parent_category, name, department_id, priority_id, sla_hours, description]);

        await connection.commit()
        return res.status(200).json({
            status:200,
            message:"Ticket categories created successfully."
        })
    } catch (error) {
        if (connection) connection.rollback();
        return error500(error, res);
    } finally{
        if (connection) connection.release();
    }
}

//Update Ticket Categories
const updateTicketCategories = async (req, res) => {
    const ticketCategoriesId = parseInt(req.params.id);
    const parent_category = req.body.parent_category ? req.body.parent_category.trim() :'';
    const name = req.body.name ? req.body.name.trim() :'';
    const department_id  = req.body.department_id  ? req.body.department_id:'';
    const priority_id  = req.body.priority_id ? req.body.priority_id.trim() :'';
    const sla_hours = req.body.sla_hours ? req.body.sla_hours.trim() :'';
    const description = req.body.description ? req.body.description.trim():'';
    
    if (!name) {
        return error422("Name is required.", res);
    }  

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        // Check if department exists
        const departmentQuery = "SELECT * FROM departments WHERE department_id  = ?";
        const departmentResult = await connection.query(departmentQuery, [department_id]);
        if (departmentResult[0].length == 0) {
            return error422("Department Not Found.", res);
        }

        // Check if priorities exists
        const priorityQuery = "SELECT * FROM priorities WHERE priority_id  = ?";
        const priorityResult = await connection.query(priorityQuery, [priority_id]);
        if (priorityResult[0].length == 0) {
            return error422("Priority Not Found.", res);
        }

  
        // Update the Ticket Categories record with new data
        const updateQuery = `
            UPDATE ticket_categories
            SET parent_category = ?, name = ?, department_id = ?, priority_id = ?, sla_hours = ?, description = ?
            WHERE ticket_category_id = ?
        `;

        await connection.query(updateQuery, [ parent_category, name, department_id, priority_id, sla_hours, description, ticketCategoriesId]);
        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "Ticket Categories updated successfully.",
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

//status change of Ticket Categories...
const onStatusChange = async (req, res) => {
    const ticketCategoriesId = parseInt(req.params.id);
    const status = parseInt(req.query.status); // Validate and parse the status parameter

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        // Check if the ticket categories exists
        const ticketCategoriesQuery = "SELECT * FROM ticket_categories WHERE ticket_category_id = ? ";
        const ticketCategoriesResult = await connection.query(ticketCategoriesQuery, [ticketCategoriesId]);

        if (ticketCategoriesResult[0].length == 0) {
            return res.status(404).json({
                status: 404,
                message: "Ticket Categories not found.",
            });
        }

        // Validate the status parameter
        if (status !== 0 && status !== 1) {
            return res.status(400).json({
                status: 400,
                message: "Invalid status value. Status must be 0 (inactive) or 1 (active).",
            });
        }

        // Soft update the ticket categories status
        const updateQuery = `
            UPDATE ticket_categories
            SET status = ?
            WHERE ticket_category_id = ?
        `;

        await connection.query(updateQuery, [status, ticketCategoriesId]);

        const statusMessage = status === 1 ? "activated" : "deactivated";
        // Commit the transaction
        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: `Ticket category ${statusMessage} successfully.`,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
};

//Ticket Categories list by id
const getTicketCategories = async (req, res) => {
    const ticketCategoriesId = parseInt(req.params.id);
    
    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        const ticketCategoriesQuery = `SELECT tc.*, d.department_name, p.name AS priority_name 
        FROM ticket_categories tc
        LEFT JOIN departments d ON d.department_id = tc.department_id
        LEFT JOIN priorities p ON p.priority_id = tc.priority_id
        WHERE tc.ticket_category_id = ?`;
        const ticketCategoriesResult = await connection.query(ticketCategoriesQuery, [ticketCategoriesId]);

        if (ticketCategoriesResult[0].length == 0) {
            return error422("Ticket Categories Not Found.", res);
        }
        const ticketCategories = ticketCategoriesResult[0][0];

        return res.status(200).json({
            status: 200,
            message: "Ticket Categories Retrived Successfully",
            data: ticketCategories
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

//all ticket categories list
const getAllTicketCategories = async (req, res) => {
    const { page, perPage, key } = req.query;

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        let getTicketCategoriesQuery = `SELECT tc.*, d.department_name, p.name AS priority_name 
        FROM ticket_categories tc
        LEFT JOIN departments d ON d.department_id = tc.department_id
        LEFT JOIN priorities p ON p.priority_id = tc.priority_id
        WHERE 1
        `;

        let countQuery = `SELECT COUNT(*) AS total FROM ticket_categories tc
        LEFT JOIN departments d ON d.department_id = tc.department_id
        LEFT JOIN priorities p ON p.priority_id = tc.priority_id
        WHERE 1
        `;

        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            if (lowercaseKey === "activated") {
                getTicketCategoriesQuery += ` AND status = 1`;
                countQuery += ` AND status = 1`;
            } else if (lowercaseKey === "deactivated") {
                getTicketCategoriesQuery += ` AND status = 0`;
                countQuery += ` AND status = 0`;
            } else {
                getTicketCategoriesQuery += ` AND LOWER(tc.parent_category) LIKE '%${lowercaseKey}%' `;
                countQuery += ` AND LOWER(tc.parent_category) LIKE '%${lowercaseKey}%' `;
            }
        }
        getTicketCategoriesQuery += " ORDER BY cts DESC";

        // Apply pagination if both page and perPage are provided
        let total = 0;
        if (page && perPage) {
            const totalResult = await connection.query(countQuery);
            total = parseInt(totalResult[0][0].total);

            const start = (page - 1) * perPage;
            getTicketCategoriesQuery += ` LIMIT ${perPage} OFFSET ${start}`;
        }

        const result = await connection.query(getTicketCategoriesQuery);
        const ticketCategories = result[0];

        // Commit the transaction
        await connection.commit();
        const data = {
            status: 200,
            message: "Ticket Categories retrieved successfully",
            data: ticketCategories,
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

//get Ticket Categories active...
const getTicketCategoriesWma = async (req, res) => {

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        const ticketCategoriesQuery = `SELECT * FROM ticket_categories
        
        WHERE status = 1  ORDER BY parent_category`;

        const ticketCategoriesResult = await connection.query(ticketCategoriesQuery);
        const ticketCategories = ticketCategoriesResult[0];

        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "Ticket Categories retrieved successfully.",
            data: ticketCategories,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

//Ticket Categories download
const getTicketCategoriesDownload = async (req, res) => {

    const { key } = req.query;

    let connection = await getConnection();
    try {
        await connection.beginTransaction();

        let getTicketCategoriesQuery = `SELECT tc.*, d.department_name, p.name AS priority_name 
        FROM ticket_categories tc
        LEFT JOIN departments d ON d.department_id = tc.department_id
        LEFT JOIN priorities p ON p.priority_id = tc.priority_id
        WHERE 1 AND tc.status = 1`;

        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            getTicketCategoriesQuery += ` AND (LOWER(name) LIKE '%${lowercaseKey}%')`;
        }

        getTicketCategoriesQuery += " ORDER BY tc.cts DESC";

        let result = await connection.query(getTicketCategoriesQuery);
        let ticketCategories = result[0];

        if (ticketCategories.length === 0) {
            return error422("No data found.", res);
        }


        ticketCategories = ticketCategories.map((item, index) => ({
            "Sr No": index + 1,
            "Create Date": item.cts,
            "Parent Category":item.parent_category,
            "Name": item.name,
            "Department Name": item.department_name,
            "Priority Name": item.priority_name

            // "Status": item.status === 1 ? "activated" : "deactivated",
        }));

        // Create a new workbook
        const workbook = xlsx.utils.book_new();

        // Create a worksheet and add only required columns
        const worksheet = xlsx.utils.json_to_sheet(ticketCategories);

        // Add the worksheet to the workbook
        xlsx.utils.book_append_sheet(workbook, worksheet, "ticketCategoriesInfo");

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
        return error500(error, res);
    } finally {
        if (connection) connection.release();
    }
};

module.exports = {
    getAllTicketCategories,
    getTicketCategoriesWma,
    createTicketCategories,
    onStatusChange,
    updateTicketCategories,
    getTicketCategories,
    getTicketCategoriesDownload
   
}