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

//create user
const createUser = async (req, res) => {
  const user_name = req.body.user_name ? req.body.user_name.trim() : "";
  const email_id = req.body.email_id ? req.body.email_id.trim() : "";
  const phone_number = req.body.phone_number ? req.body.phone_number : null;
  const role_id = req.body.role_id ? req.body.role_id : 0;
  const department_id = req.body.department_id ? req.body.department_id : 0;
  const customerAgent = req.body.customerAgent ? req.body.customerAgent :[];
  const password = "123456";

  if (!user_name) {
    return error422("User name is required.", res);
  } else if (!email_id) {
    return error422("Email id is required.", res);
  } else if (!phone_number) {
    return error422("Phone number is required.", res);
  } else if (!password) {
    return error422("Password is required.", res);
  } else if (!role_id && role_id != 0) {
    return error422("role_id is required.", res);
  } else if (!department_id && department_id != 0) {
    return error422("Department is required.", res);
  }

  
    //check User Name already is exists or not
    const isExistUserNameQuery = `SELECT * FROM users WHERE LOWER(TRIM(user_name))= ?`;
    const isExistUserNameResult = await pool.query(isExistUserNameQuery, [user_name.toLowerCase()]);
    if (isExistUserNameResult[0].length > 0) {
        return error422(" User Name is already exists.", res);
    }

    // Check if email_id exists
    const checkUserQuery = "SELECT * FROM users WHERE LOWER(TRIM(email_id)) = ? AND status = 1";
    const checkUserResult = await pool.query(checkUserQuery, [email_id.toLowerCase()]);
    if (checkUserResult[0].length > 0) {
        return error422('Email id is already exists.', res);
    }
    

    // Attempt to obtain a database connection
    let connection = await getConnection();
    try {
        //Start the transaction
        await connection.beginTransaction();
        //insert into user
        const insertUserQuery = `INSERT INTO users (user_name, email_id, phone_number, role_id, department_id ) VALUES (?, ?, ?, ?, ?)`;
        const insertUserValues = [ user_name, email_id, phone_number, role_id, department_id ];
        const insertuserResult = await connection.query(insertUserQuery, insertUserValues);
        const user_id = insertuserResult[0].insertId;
        
        if (role_id == 3) {
        let customerAgentArray = customerAgent;
        for (let i = 0; i < customerAgentArray.length; i++) {
            const elements = customerAgentArray[i];
            const Technician_id = elements.user_id ? elements.user_id : '';
          
             // Check if Technician exists
              const technicianQuery = "SELECT user_id FROM users WHERE role_id = 2 AND user_id = ?";
              const technicianResult = await connection.query(technicianQuery,[Technician_id]);
              if (technicianResult[0].length == 0) {
                return error422("Technician Not Found.", res);
              }

            const insertAgentQuery = `INSERT INTO customer_agents (customer_id, user_id ) VALUES (?, ?)`;
            const insertAgentValues = [ user_id, Technician_id ];
            const insertAgentResult = await connection.query(insertAgentQuery, insertAgentValues);
        }
      }
         
        
        const hash = await bcrypt.hash(password, 10); // Hash the password using bcrypt

        //insert into Untitled
        const insertUntitledQuery =
            "INSERT INTO untitled (user_id, extenstions) VALUES (?,?)";
        const insertUntitledValues = [user_id, hash];
        const untitledResult = await connection.query(insertUntitledQuery, insertUntitledValues)

        //commit the transation
        await connection.commit();
        res.status(200).json({
            status: 200,
            message: `User added successfully`,
        });
    } catch (error) {
        await connection.rollback();
        return error500(error, res);
    } finally {
        await connection.release();
    }
};
  
//login
const login = async (req, res) => {
  let email_id = req.body.email_id ? req.body.email_id.trim() : "";
  const password = req.body.password ? req.body.password.trim() : "";
  if (!email_id) {
    return error422("Email id is required.", res);
  } else if (!password) {
    return error422("Password is required.", res);
  }
  // Attempt to obtain a database connection
  let connection = await getConnection();
  try {
    //Start the transaction
    await connection.beginTransaction();
    //check email id is exist
    const query = `SELECT u.*, d.department_name FROM users u
    LEFT JOIN departments d
    ON u.department_id = d.department_id 
    WHERE TRIM(LOWER(u.email_id)) = ? AND u.status = 1`;
    const result = await connection.query(query, [email_id.toLowerCase()]);
    const check_user = result[0][0];
    if (!check_user) {
        return error422("Authentication failed.", res);
    }

// Check if the user with the provided Untitled id exists
        const checkUserUntitledQuery = "SELECT * FROM untitled WHERE user_id = ?";
        const [checkUserUntitledResult] = await connection.query(checkUserUntitledQuery, [check_user.user_id]);
        const user_untitled = checkUserUntitledResult[0];
        if (!user_untitled) {
            return error422("Authentication failed.", res);
        }

        const isPasswordValid = await bcrypt.compare(password, user_untitled.extenstions);
        if (!isPasswordValid) {
            return error422("Password wrong.", res);
        }
        // Generate a JWT token
        const token = jwt.sign(
            {
                user_id: user_untitled.user_id,
                email_id: check_user.email_id,
            },
            "secret_this_should_be", // Use environment variable for secret key
            { expiresIn: "1h" }
        );
        const userDataQuery = `SELECT u.*, d.department_name, r.role_name FROM users u
        LEFT JOIN departments d ON d.department_id = u.department_id
        LEFT JOIN roles r ON r.role_id = u.role_id
        WHERE u.user_id = ? `;
        let userDataResult = await connection.query(userDataQuery, [check_user.user_id]);

        // Commit the transaction
        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: "Authentication successfully",
            token: token,
            expiresIn: 36000, // 1 hour in seconds,
            data: userDataResult[0][0],
        });

    } catch (error) {
        return error500(error, res)
    } finally {
        await connection.release();
    }
};

// get User list...
const getUsers = async (req, res) => {
    const { page, perPage, key } = req.query;

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        let getUserQuery = `SELECT u.*, d.department_name, r.role_name 
        FROM users u 
        LEFT JOIN departments d
        ON d.department_id = u.department_id
        LEFT JOIN roles r
        ON r.role_id = u.role_id
        WHERE 1`;

        let countQuery = `SELECT COUNT(*) AS total FROM users u 
        FROM users u 
        LEFT JOIN departments d
        ON d.department_id = u.department_id
        LEFT JOIN roles r
        ON r.role_id = u.role_id
        WHERE 1`;

        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            if (lowercaseKey === "activated") {
                getUserQuery += ` AND status = 1`;
                countQuery += ` AND status = 1`;
            } else if (lowercaseKey === "deactivated") {
                getUserQuery += ` AND status = 0`;
                countQuery += ` AND status = 0`;
            } else {
                getUserQuery += ` AND (LOWER(u.user_name) LIKE '%${lowercaseKey}%' || LOWER(r.role_name) LIKE '%${lowercaseKey}%')`;
                countQuery += ` AND (LOWER(u.user_name) LIKE '%${lowercaseKey}%' || LOWER(r.role_name) LIKE '%${lowercaseKey}%')`;
            }
        }
        getUserQuery += " ORDER BY u.created_at DESC";

        // Apply pagination if both page and perPage are provided
        let total = 0;
        if (page && perPage) {
            const totalResult = await connection.query(countQuery);
            total = parseInt(totalResult[0][0].total);

            const start = (page - 1) * perPage;
            getUserQuery += ` LIMIT ${perPage} OFFSET ${start}`;
        }

        const result = await connection.query(getUserQuery);
        const user = result[0];

        // Commit the transaction
        await connection.commit();
        const data = {
            status: 200,
            message: "User retrieved successfully",
            data: user,
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

//get user active...
const getUserWma = async (req, res) => {
     const { department_id} = req.query;

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        let userQuery = `SELECT u.*, d.department_name, r.role_name 
        FROM users u 
        LEFT JOIN departments d
        ON d.department_id = u.department_id
        LEFT JOIN roles r
        ON r.role_id = u.role_id
        WHERE 1 AND u.status = 1`;

        if (department_id) {
        userQuery += ` AND u.department_id = '${department_id}'`;
        }

        userQuery += ` ORDER BY u.user_name`;
        const userResult = await connection.query(userQuery);
        const user = userResult[0];

        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "User retrieved successfully.",
            data: user,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

//agent
const getAgentsWma = async (req, res) => {
     const { user_id} = req.query;

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        let agentQuery = `SELECT ca.*, u.user_name, u1.user_name AS customer_name
        FROM customer_agents ca
        LEFT JOIN users u ON u.user_id = ca.user_id
        LEFT JOIN users u1 ON u1.user_id = ca.customer_id
        WHERE 1 AND ca.status = 1`;

        if (user_id) {
        agentQuery += ` AND ca.customer_id = '${user_id}'`;
        }

        agentQuery += ` ORDER BY ca.cts`;
        const agentResult = await connection.query(agentQuery);
        const agent = agentResult[0];

        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "Customer Agents retrieved successfully.",
            data: agent,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}
    
module.exports = {
  createUser,
  login,
  getUsers,
  getUserWma,
  getAgentsWma
};