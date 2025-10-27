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

//create role
const createRole = async (req, res)=>{
    const role_name = req.body.role_name ? req.body.role_name.trim() :'';
    const description = req.body.description ? req.body.description.trim():'';
    
    if (!role_name) {
        return error422("Role name is required.", res);
    }  

    let connection = await getConnection();

    const isRoleExist = "SELECT * FROM roles WHERE LOWER(TRIM(role_name)) = ?";
    const isRoleResult = await connection.query(isRoleExist,[role_name.toLowerCase()]);
    if (isRoleResult[0].length>0) {
        return error422("Role is already is exist.", res);
    }

    try {
        // start the transaction
        await connection.beginTransaction();
        const insertQuery = "INSERT INTO roles (role_name, description)VALUES(?, ?)";
        const result = await connection.query(insertQuery,[role_name, description]);

        await connection.commit()
        return res.status(200).json({
            status:200,
            message:"Role created successfully."
        })
    } catch (error) {
        if (connection) connection.rollback();
        return error500(error, res);
    } finally{
        if (connection) connection.release();
    }
}

//Update Role
const updateRole = async (req, res) => {
    const roleId = parseInt(req.params.id);
    const role_name = req.body.role_name ? req.body.role_name.trim() : '';
    const description = req.body.description ? req.body.description.trim():'';

    if (!role_name) {
        return error422("Role name is required.", res);
    }

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        // Check if role exists
        const roleQuery = "SELECT * FROM roles WHERE role_id  = ?";
        const roleResult = await connection.query(roleQuery, [roleId]);
        if (roleResult[0].length == 0) {
            return error422("Role Not Found.", res);
        }
        // Check if the provided role exists and is active 
        const existingRoleQuery = "SELECT * FROM roles WHERE role_name  = ? AND role_id !=?";
        const existingRoleResult = await connection.query(existingRoleQuery, [role_name, roleId]);

        if (existingRoleResult[0].length > 0) {
            return error422("Role already exists.", res);
        }

        // Update the role record with new data
        const updateQuery = `
            UPDATE roles
            SET role_name = ?, description = ?
            WHERE role_id = ?
        `;

        await connection.query(updateQuery, [ role_name, description, roleId]);
        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "Role updated successfully.",
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

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

//status change of Role...
const onStatusChange = async (req, res) => {
    const roleId = parseInt(req.params.id);
    const status = parseInt(req.query.status); // Validate and parse the status parameter


    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        // Check if the role exists
        const roleQuery = "SELECT * FROM roles WHERE role_id = ? ";
        const roleResult = await connection.query(roleQuery, [roleId]);

        if (roleResult[0].length == 0) {
            return res.status(404).json({
                status: 404,
                message: "Role not found.",
            });
        }

        // Validate the status parameter
        if (status !== 0 && status !== 1) {
            return res.status(400).json({
                status: 400,
                message: "Invalid status value. Status must be 0 (inactive) or 1 (active).",
            });
        }

        // Soft update the role status
        const updateQuery = `
            UPDATE roles
            SET status = ?
            WHERE role_id = ?
        `;

        await connection.query(updateQuery, [status, roleId]);

        const statusMessage = status === 1 ? "activated" : "deactivated";
        // Commit the transaction
        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: `Role ${statusMessage} successfully.`,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
};

//Role list by id
const getRole = async (req, res) => {
    const roleId = parseInt(req.params.id);
    
    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        const roleQuery = `SELECT * FROM roles
        WHERE role_id = ?`;
        const roleResult = await connection.query(roleQuery, [roleId]);

        if (roleResult[0].length == 0) {
            return error422("Role Not Found.", res);
        }
        const role = roleResult[0][0];

        return res.status(200).json({
            status: 200,
            message: "Role Retrived Successfully",
            data: role
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

//Role download
const getRoleDownload = async (req, res) => {

    const { key } = req.query;

    let connection = await getConnection();
    try {
        await connection.beginTransaction();

        let getRoleQuery = `SELECT * FROM roles
        WHERE 1 AND status = 1`;

        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            getRoleQuery += ` AND (LOWER(role_name) LIKE '%${lowercaseKey}%')`;
        }

        getRoleQuery += " ORDER BY cts DESC";

        let result = await connection.query(getRoleQuery);
        let role = result[0];

        if (role.length === 0) {
            return error422("No data found.", res);
        }


        role = role.map((item, index) => ({
            "Sr No": index + 1,
            "Create Date": item.cts,
            "Role Name":item.role_name,
            "Description": item.description

            // "Status": item.status === 1 ? "activated" : "deactivated",
        }));

        // Create a new workbook
        const workbook = xlsx.utils.book_new();

        // Create a worksheet and add only required columns
        const worksheet = xlsx.utils.json_to_sheet(role);

        // Add the worksheet to the workbook
        xlsx.utils.book_append_sheet(workbook, worksheet, "RoleInfo");

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
    getAllRoles,
    getRolesWma,
    createRole,
    updateRole,
    onStatusChange,
    getRole,
    getRoleDownload
   
}