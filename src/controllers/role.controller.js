const pool = require("../../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

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


//all Roles list
const getAllRoles = async (req, res) => {
    const { page, perPage, key } = req.query;

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        let getRolesQuery = `SELECT * FROM roles`;

        let countQuery = `SELECT COUNT(*) AS total FROM roles`;

        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            if (lowercaseKey === "activated") {
                getRolesQuery += ` AND status = 1`;
                countQuery += ` AND status = 1`;
            } else if (lowercaseKey === "deactivated") {
                getRolesQuery += ` AND status = 0`;
                countQuery += ` AND status = 0`;
            } else {
                getRolesQuery += ` AND LOWER(role_name) LIKE '%${lowercaseKey}%' `;
                countQuery += ` AND LOWER(role_name) LIKE '%${lowercaseKey}%' `;
            }
        }
        getRolesQuery += " ORDER BY cts DESC";

        // Apply pagination if both page and perPage are provided
        let total = 0;
        if (page && perPage) {
            const totalResult = await connection.query(countQuery);
            total = parseInt(totalResult[0][0].total);

            const start = (page - 1) * perPage;
            getRolesQuery += ` LIMIT ${perPage} OFFSET ${start}`;
        }

        const result = await connection.query(getRolesQuery);
        const roles = result[0];

        // Commit the transaction
        await connection.commit();
        const data = {
            status: 200,
            message: "Roles retrieved successfully",
            data: roles,
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

//get Roles active...
const getRolesWma = async (req, res) => {

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        const roleQuery = `SELECT * FROM roles
        
        WHERE status = 1  ORDER BY role_name`;

        const roleResult = await connection.query(roleQuery);
        const role = roleResult[0];

        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "Role retrieved successfully.",
            data: role,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

module.exports = {
    getAllRoles,
    getRolesWma
   
}