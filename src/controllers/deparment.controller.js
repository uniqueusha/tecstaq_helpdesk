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

//create department
const createDepartment = async (req, res)=>{
    const department_name = req.body.department_name ? req.body.department_name.trim() :'';
    const description = req.body.description ? req.body.description.trim():'';
    
    if (!department_name) {
        return error422("Department name is required.", res);
    }  

    let connection = await getConnection();

    const isDepartmentExist = "SELECT * FROM departments WHERE LOWER(TRIM(department_name)) = ?";
    const isDepartmentResult = await connection.query(isDepartmentExist,[department_name.toLowerCase()]);
    if (isDepartmentResult[0].length>0) {
        return error422("Department is already is exist.", res);
    }

    try {
        // start the transaction
        await connection.beginTransaction();
        const insertQuery = "INSERT INTO departments (department_name, description)VALUES(?, ?)";
        const result = await connection.query(insertQuery,[department_name, description]);

        await connection.commit()
        return res.status(200).json({
            status:200,
            message:"Department created successfully."
        })
    } catch (error) {
        if (connection) connection.rollback();
        return error500(error, res);
    } finally{
        if (connection) connection.release();
    }
}

//Update Department
const updateDepartment = async (req, res) => {
    const departmentId = parseInt(req.params.id);
    const department_name = req.body.department_name ? req.body.department_name.trim() : '';
    const description = req.body.description ? req.body.description.trim():'';

    if (!department_name) {
        return error422("Department name is required.", res);
    }

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        // Check if department exists
        const departmentQuery = "SELECT * FROM departments WHERE department_id  = ?";
        const departmentResult = await connection.query(departmentQuery, [departmentId]);
        if (departmentResult[0].length == 0) {
            return error422("Department Not Found.", res);
        }
        // Check if the provided department exists and is active 
        const existingDepartmentQuery = "SELECT * FROM departments WHERE department_name  = ? AND department_id !=?";
        const existingDepartmentResult = await connection.query(existingDepartmentQuery, [department_name, departmentId]);

        if (existingDepartmentResult[0].length > 0) {
            return error422("Department already exists.", res);
        }

        // Update the department record with new data
        const updateQuery = `
            UPDATE departments
            SET department_name = ?, description = ?
            WHERE department_id = ?
        `;

        await connection.query(updateQuery, [ department_name, description, departmentId]);
        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "Department updated successfully.",
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

//status change of Department...
const onStatusChange = async (req, res) => {
    const departmentId = parseInt(req.params.id);
    const status = parseInt(req.query.status); // Validate and parse the status parameter


    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        // Check if the departments exists
        const departmentsQuery = "SELECT * FROM departments WHERE department_id = ? ";
        const departmentsResult = await connection.query(departmentsQuery, [departmentId]);

        if (departmentsResult[0].length == 0) {
            return res.status(404).json({
                status: 404,
                message: "Department not found.",
            });
        }

        // Validate the status parameter
        if (status !== 0 && status !== 1) {
            return res.status(400).json({
                status: 400,
                message: "Invalid status value. Status must be 0 (inactive) or 1 (active).",
            });
        }

        // Soft update the department status
        const updateQuery = `
            UPDATE departments
            SET status = ?
            WHERE department_id = ?
        `;

        await connection.query(updateQuery, [status, departmentId]);

        const statusMessage = status === 1 ? "activated" : "deactivated";
        // Commit the transaction
        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: `Department ${statusMessage} successfully.`,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
};

//all departments list
const getAllDepartment = async (req, res) => {
    const { page, perPage, key } = req.query;

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        let getDepartmentQuery = `SELECT * FROM departments`;

        let countQuery = `SELECT COUNT(*) AS total FROM departments`;

        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            if (lowercaseKey === "activated") {
                getDepartmentQuery += ` AND status = 1`;
                countQuery += ` AND status = 1`;
            } else if (lowercaseKey === "deactivated") {
                getDepartmentQuery += ` AND status = 0`;
                countQuery += ` AND status = 0`;
            } else {
                getDepartmentQuery += ` AND LOWER(department_name) LIKE '%${lowercaseKey}%' `;
                countQuery += ` AND LOWER(department_name) LIKE '%${lowercaseKey}%' `;
            }
        }
        getDepartmentQuery += " ORDER BY cts DESC";

        // Apply pagination if both page and perPage are provided
        let total = 0;
        if (page && perPage) {
            const totalResult = await connection.query(countQuery);
            total = parseInt(totalResult[0][0].total);

            const start = (page - 1) * perPage;
            getDepartmentQuery += ` LIMIT ${perPage} OFFSET ${start}`;
        }

        const result = await connection.query(getDepartmentQuery);
        const departments = result[0];

        // Commit the transaction
        await connection.commit();
        const data = {
            status: 200,
            message: "Departments retrieved successfully",
            data: departments,
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

//Department list by id
const getDepartment = async (req, res) => {
    const departmentId = parseInt(req.params.id);
    
    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        const departmentQuery = `SELECT * FROM departments
        WHERE department_id = ?`;
        const departmentResult = await connection.query(departmentQuery, [departmentId]);

        if (departmentResult[0].length == 0) {
            return error422("Department Not Found.", res);
        }
        const department = departmentResult[0][0];

        return res.status(200).json({
            status: 200,
            message: "Department Retrived Successfully",
            data: department
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

//get Department active...
const getDepartmentsWma = async (req, res) => {

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        const departmentQuery = `SELECT * FROM departments
        
        WHERE status = 1  ORDER BY department_name`;

        const departmentResult = await connection.query(departmentQuery);
        const department = departmentResult[0];

        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "Department retrieved successfully.",
            data: department,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

//Department download
const getDepartmentDownload = async (req, res) => {

    const { key } = req.query;

    let connection = await getConnection();
    try {
        await connection.beginTransaction();

        let getDepartmentQuery = `SELECT * FROM departments
        WHERE 1 AND status = 1`;

        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            getDepartmentQuery += ` AND (LOWER(department_name) LIKE '%${lowercaseKey}%')`;
        }

        getDepartmentQuery += " ORDER BY cts DESC";

        let result = await connection.query(getDepartmentQuery);
        let department = result[0];

        if (department.length === 0) {
            return error422("No data found.", res);
        }


        department = department.map((item, index) => ({
            "Sr No": index + 1,
            "Create Date": item.cts,
            "Department Name":item.department_name,
            "Description": item.description

            // "Status": item.status === 1 ? "activated" : "deactivated",
        }));

        // Create a new workbook
        const workbook = xlsx.utils.book_new();

        // Create a worksheet and add only required columns
        const worksheet = xlsx.utils.json_to_sheet(department);

        // Add the worksheet to the workbook
        xlsx.utils.book_append_sheet(workbook, worksheet, "DepartmentInfo");

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
    createDepartment,
    getAllDepartment,
    getDepartmentsWma,
    updateDepartment,
    onStatusChange,
    getDepartment,
    getDepartmentDownload
   
}