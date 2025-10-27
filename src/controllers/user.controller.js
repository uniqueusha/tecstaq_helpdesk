const pool = require("../../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host: "smtp-mail.outlook.com",
    port: 587,
    secure: false,
    auth: {
        user: "support@tecstaq.com",
        pass: "Homeoffice@2025#$",
    },
    tls: {
        rejectUnauthorized: false,
    },
 });
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

        // try {
        const message = `
      <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>Welcome to test</title>
          <style>
              div{
              font-family: Arial, sans-serif; 
               margin: 0px;
                padding: 0px;
                color:black;
              }
          </style>
        </head>
        <body>
        <div>
       <h2 style="text-transform: capitalize;">Hi ${user_name},</h2>
       <h3>Welcome to Tecstaq!</h3>

        <p>Your account has been successfully created. Here are your login details:</p>
        <p>Email: ${email_id}</p>
        <p>Temporary Password: ${password}</P>
        <p>You can log in using the following link:
          <a href="https://desk.tecstaq.com/">https://desk.tecstaq.com/</a></p>
          <p>For security reasons, please change your password after your first login.</p>
          <p>If you didn’t request this account or believe this was created in error, please contact our support team at support@tecstaq.com.</p>
          <p>Thank you,</p>
          <p><strong>Tecstaq Support</strong></p>

        </div>
        </body>
        </html>`;

        // Prepare the email message options.
        const mailOptions = {
            from: "support@tecstaq.com", // Sender address from environment variables.
            to: `${email_id}`, // Recipient's name and email address."sushantsjamdade@gmail.com",
            bcc: ["sushantsjamdade@gmail.com"],
            subject: "Welcome to Tecstaq HelpDesk Support! Your Account Has Been Created", // Subject line.
            html: message,
        };

        try {
      await transporter.sendMail(mailOptions);
      return res.status(200).json({
        status: 200,
        message: `User created successfully.`,
      });
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
      return res.status(200).json({
        status: 200,
        message: "User created successfully, but failed to send email.",
      });
    }
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

//User by id
const getUser = async (req, res) => {
    const userId = parseInt(req.params.id);

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        const userQuery = `SELECT u.*, d.department_name, r.role_name 
        FROM users u 
        LEFT JOIN departments d
        ON d.department_id = u.department_id
        LEFT JOIN roles r
        ON r.role_id = u.role_id
        WHERE 1 AND u.user_id = ? `;
        const userResult = await connection.query(userQuery, [userId]);
        if (userResult[0].length == 0) {
            return error422("User Not Found.", res);
        }
        const user = userResult[0][0];
    
        if (user.role_id == 3){
        let agentQuery = `SELECT ca.*, u.user_name, u1.user_name AS aechnician_name FROM customer_agents ca
            LEFT JOIN users u ON u.user_id = ca.user_id
            LEFT JOIN users u1 ON u1.user_id = ca.customer_id
            WHERE ca.customer_id = ?`
        let agentResult = await connection.query(agentQuery, [userId]);
        user['agent'] = agentResult[0];
        }

        return res.status(200).json({
            status: 200,
            message: "User Retrived Successfully",
            data: user
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

//Update User
const updateUser = async (req, res) => {
    const userId = parseInt(req.params.id);
    const user_name = req.body.user_name ? req.body.user_name.trim() : "";
    const email_id = req.body.email_id ? req.body.email_id.trim() : "";
    const phone_number = req.body.phone_number ? req.body.phone_number : null;
    const role_id = req.body.role_id ? req.body.role_id : 0;
    const department_id = req.body.department_id ? req.body.department_id : 0;
    const customerAgent = req.body.customerAgent ? req.body.customerAgent :[];
    if (!user_name) {
        return error422("User name is required.", res);
    } else if (!email_id) {
        return error422("Email id is required.", res);
    } else if (!phone_number) {
        return error422("Phone number is required.", res);
    }


    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        // Check if user exists
        const userQuery = "SELECT * FROM users WHERE user_id  = ?";
        const userResult = await connection.query(userQuery, [userId]);
        if (userResult[0].length === 0) {
            return error422("User Not Found.", res);
        }

        // Update the user record with new data
        const updateQuery = `
            UPDATE users
            SET user_name = ?, email_id = ?, phone_number = ?, role_id = ?, department_id = ?
            WHERE user_id = ?
        `;

        await connection.query(updateQuery, [ user_name, email_id, phone_number, role_id, department_id, userId]);

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
        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "User updated successfully.",
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

//status change of user...
const onStatusChange = async (req, res) => {
    const userId = parseInt(req.params.id);
    const status = parseInt(req.query.status); // Validate and parse the status parameter


    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        // Check if the user exists
        const userQuery = "SELECT * FROM users WHERE user_id = ? ";
        const userResult = await connection.query(userQuery, [userId]);

        if (userResult[0].length == 0) {
            return res.status(404).json({
                status: 404,
                message: "User not found.",
            });
        }

        // Validate the status parameter
        if (status !== 0 && status !== 1) {
            return res.status(400).json({
                status: 400,
                message: "Invalid status value. Status must be 0 (inactive) or 1 (active).",
            });
        }

        // Soft update the user
        const updateQuery = `
            UPDATE users
            SET status = ?
            WHERE user_id = ?
        `;

        await connection.query(updateQuery, [status, userId]);

        const statusMessage = status === 1 ? "activated" : "deactivated";
        // Commit the transaction
        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: `User ${statusMessage} successfully.`,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
};

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

//get Technician active...
const getTechnicianWma = async (req, res) => {
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
        WHERE 1 AND u.status = 1 AND u.role_id = 2`;

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
        agentQuery += ` AND ca.customer_id = '${user_id}' OR ca.user_id = '${user_id}'`;
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

//change password
const onChangePassword = async (req, res) => {
    const email_id = req.body.email_id ? req.body.email_id.trim() : "";
    const password = req.body.password || "";
    const new_password = req.body.new_password || "";
    const new_email = req.body.new_email ? req.body.new_email.trim() : "";
    if (!email_id) {
        return error422("Email Id required.", res);
    }
    if (!password) {
        return error422("Password is required.", res);
    }
    if (!new_password) {
        return error422("New password is required.", res);
    }

    let connection = await getConnection();

    try {
        await connection.beginTransaction();

        // Check if email_id exists
        const checkUserQuery = "SELECT * FROM users WHERE LOWER(TRIM(email_id)) = ? AND status = 1";
        const [checkUserResult] = await connection.query(checkUserQuery, [email_id.toLowerCase()]);
        if (checkUserResult.length === 0) {
            return error422('Email id is not found.', res);
        }

        const userData = checkUserResult[0]; // Extract the first row

        // Retrieve the hashed password from the database (update column name if needed)
        const untitledQuery = 'SELECT extenstions FROM untitled WHERE user_id = ?';
        const [untitledResult] = await connection.query(untitledQuery, [userData.user_id]);

        if (untitledResult.length === 0) {
            return error422("Password not found for this user.", res);
        }

        const hash = untitledResult[0].extenstions;
        if (!hash) {
            return error422('Stored password hash is missing.', res);
        }

        const isValid = await bcrypt.compare(password, hash);
        if (!isValid) {
            return error422('Incorrect password.', res);
        }

        // Hash the new password
        const newHashedPassword = await bcrypt.hash(new_password, 10);

        // Update the user's password in the database
        const updatePasswordQuery = `UPDATE untitled SET extenstions = ? WHERE user_id = ?`;
        await connection.query(updatePasswordQuery, [newHashedPassword, userData.user_id]);

        // If new email is provided, update it
        if (new_email) {
            // Check if the new email already exists
            const checkNewEmailQuery = "SELECT email_id FROM users WHERE LOWER(TRIM(email_id)) = ?";
            const [emailCheckResult] = await connection.query(checkNewEmailQuery, [new_email.toLowerCase()]);

            if (emailCheckResult.length > 0) {
                return error422("New email is already in use.", res);
            }

            // Update the email
            const updateEmailQuery = `UPDATE users SET email_id = ? WHERE user_id = ?`;
            await connection.query(updateEmailQuery, [new_email, userData.user_id]);
        }

        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: "Password updated successfully."
        });

    } catch (error) {
        await connection.rollback();
        error500(error, res);
    } finally {
        if (connection) connection.release();
    }
};

//send otp 
const sendOtp = async (req, res) => {
    const email_id = req.body.email_id;
    if (!email_id) {
        return error422("Email is  required.", res);
    }
    // Check if email_id exists
    const query = 'SELECT * FROM users WHERE TRIM(LOWER(email_id)) = ?';
    const result = await pool.query(query, [email_id.toLowerCase()]);
    if (result[0].length === 0) {
        return error422('Email id is not found.', res);
    }

    let user_name = result[0][0].user_name;

    let connection = await getConnection();
    try {
        //Start the transaction
        await connection.beginTransaction();
        const otp = Math.floor(100000 + Math.random() * 900000);
        const deleteQuery = `DELETE FROM otp WHERE cts < NOW() - INTERVAL 5 MINUTE`;
        const deleteResult = await connection.query(deleteQuery);

        const otpQuery = "INSERT INTO otp (otp, email_id) VALUES (?, ?)";
        const otpResult = await connection.query(otpQuery, [otp, email_id])

        const message = `
      <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>Welcome to Tecstaq-helddesk.com</title>
          <style>
              div{
              font-family: Arial, sans-serif; 
               margin: 0px;
                padding: 0px;
                color:black;
              }
          </style>
        </head>
        <body>
        <div>
       <h2 style="text-transform: capitalize;">Hello ${user_name},</h2>
        <p>It seems you requested a password reset for your Tecstaq-helddesk account. Use the OTP below to complete the process and regain access to your account.</p>
        <h3>Your OTP: <strong>${otp}</strong></h3>
        <p>For security, this OTP will expire in 5 minutes. Please don’t share this code with anyone. If you didn’t request a password reset, please ignore this email or reach out to our support team for assistance.</p>
        <h4>What’s Next?</h4>
        <ol>
          <li>Enter the OTP on the password reset page.</li>
          <li>Set your new password, and you’re all set to log back in.</li>
        <li>Thank you for using Tecstaq-helddesk Application!</li>
        </ol>
        <p>Best regards,<br>The Tecstaq-helddesk Team</p>
         </div>
        </body>
        </html>`;

        // Validate required fields.
        if (!email_id || !message) {
            return res
                .status(400)
                .json({ status: "error", message: "Missing required fields" });
        }

        // Prepare the email message options.
        const mailOptions = {
            from: "support@tecstaq.com", // Sender address from environment variables.
            to: `${email_id}`, // Recipient's name and email address.
            //    replyTo: "rohitlandage86@gmail.com", // Sets the email address for recipient responses.
            //  bcc: "sushantsjamdade@gmail.com",
            bcc: "sushantsjamdade@gmail.com",
            subject: "Reset Your Tecstaq-crm Password – OTP Inside", // Subject line.
            html: message,
        };

        // Send email 
        await transporter.sendMail(mailOptions);

        return res.status(200).json({
            status: 200,
            message: `OTP sent successfully to ${email_id}.`,

        })
    } catch (error) {
        return error500(error, res)
    } finally {
        if (connection) connection.release()
    }
}

//verify otp
const verifyOtp = async (req, res) => {
    const otp = req.body.otp ? req.body.otp : null;
    const email_id = req.body.email_id ? req.body.email_id.trim() : null;
    if (!otp) {
        return error422("Otp is required.", res);
    } else if (!email_id) {
        return error422("Email id is required.", res);
    }

    let connection = await getConnection();
    try {
        //Start the transaction
        await connection.beginTransaction();

        // Delete expired OTPs

        const deleteQuery = `DELETE FROM otp WHERE cts < NOW() - INTERVAL 5 MINUTE`;
        const deleteResult = await connection.query(deleteQuery);

        // Check if OTP is valid and not expired
        const verifyOtpQuery = `
        SELECT * FROM otp 
        WHERE TRIM(LOWER(email_id)) = ? AND otp = ?
      `;
        const verifyOtpResult = await connection.query(verifyOtpQuery, [email_id.trim().toLowerCase(), otp]);

        // If no OTP is found, return a failed verification message
        if (verifyOtpResult[0].length === 0) {
            return error422("OTP verification failed.", res);
        }

        // Check if the OTP is expired
        const otpData = verifyOtpResult;
        const otpCreatedTime = otpData.cts;
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

        if (otpCreatedTime < fiveMinutesAgo) {
            return error422("OTP has expired. Please request a new one.", res);
        }

        // OTP is valid and within the 5-minute limit
        return res.status(200).json({
            status: 200,
            message: "OTP verified successfully"
        });

    } catch (error) {
        return error500(error, res)
    } finally {
        if (connection) connection.release();
    }
};

//check email_id
const checkEmailId = async (req, res) => {
    const email_id = req.body.email_id ? req.body.email_id.trim() : ""; // Extract and trim email_id from request body
    if (!email_id) {
        return error422("Email Id required.", res);
    }

    let connection = await getConnection();
    try {
        //Start the transaction
        await connection.beginTransaction();

        // Check if email_id exists
        const query = 'SELECT * FROM users WHERE TRIM(LOWER(email_id)) = ?';
        const result = await connection.query(query, [email_id.toLowerCase()]);
        if (result[0].length === 0) {
            return error422('Email id is not found.', res);
        }
        const untitledData = result;

        return res.status(200).json({
            status: 200,
            message: "Email Id Exists",
            email_id: true,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release();
    }
};

//forget password
const forgotPassword = async (req, res) => {
    const email_id = req.body.email_id ? req.body.email_id.trim() : null;
    const newPassword = req.body.newPassword ? req.body.newPassword.trim() : null;
    const confirmPassword = req.body.confirmPassword ? req.body.confirmPassword.trim() : null;
    if (!email_id) {
        return error422("Email id is requried", res);
    } else if (!newPassword) {
        return error422("New password is required.", res);
    } else if (!confirmPassword) {
        return error422("Confirm password is required.", res);
    } else if (newPassword !== confirmPassword) {
        return error422("New password and Confirm password do not match.", res);
    }

    let connection = await getConnection();
    try {
        //Start the transaction
        await connection.beginTransaction();

        // Check if email_id exists
        const query = 'SELECT * FROM users WHERE TRIM(LOWER(email_id)) = ?';
        const result = await connection.query(query, [email_id.toLowerCase()]);
        if (result[0].length === 0) {
            return error404('Email id is not found.', res);
        }
        const untitledData = result[0][0];

        // Hash the new password
        const hash = await bcrypt.hash(confirmPassword, 10);

        const updateQuery = `UPDATE untitled SET extenstions = ? WHERE user_id = ?`;
        const [updateResult] = await connection.query(updateQuery, [hash, untitledData.user_id]);

        // Commit the transaction
        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: "Password has been updated successfully"
        })
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release();
    }
};

const sendOtpIfEmailIdNotExists = async (req, res) => {
    const email_id = req.body.email_id;
    if (!email_id) {
        return error422("Email is required.", res);
    }

    // Check if email_id exists
    const query = 'SELECT * FROM users WHERE TRIM(LOWER(email_id)) = ?';
    const result = await pool.query(query, [email_id.toLowerCase()]);

    if (result.rowCount > 0) {
        // If email_id exists, return an error response
        return error422('Email ID already exists. OTP will not be sent.', res);
    }

    let connection = await getConnection();
    try {
        //Start the transaction
        await connection.beginTransaction();

        // Generate a 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000);

        // Delete expired OTPs from the table (older than 5 minutes)
        const deleteQuery = `DELETE FROM otp WHERE cts < NOW() - INTERVAL 5 MINUTE`;
        const deleteResult = await connection.query(deleteQuery);

        // Insert the new OTP into the database
        const otpQuery = "INSERT INTO otp (otp, email_id) VALUES (?, ?)";
        await connection.query(otpQuery, [otp, email_id]);

        // Compose the email message with OTP details
        const message = `
      <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>Welcome to Tecstaq-helpdesk.com</title>
          <style>
              div {
                font-family: Arial, sans-serif; 
                margin: 0px;
                padding: 0px;
                color: black;
              }
          </style>
        </head>
        <body>
        <div>
          <h2>Hello,</h2>
          <p>Thank you for registering at Tecstaq-helpdesk.com. Use the OTP below to complete your registration.</p>
          <h3>Your OTP: <strong>${otp}</strong></h3>
          <p>This OTP will expire in 5 minutes. Please don’t share this code with anyone.</p>
          <p>Best regards,<br>The Tecstaq-helpdesk Team</p>
        </div>
        </body>
        </html>`;

        // Email options
        const mailOptions = {
            from: "support@tecstaq.com",
            to: email_id,
            // replyTo: "rohitlandage86@gmail.com",
            bcc: "sushantsjamdade@gmail.com",
            //bcc: "ushamyadav777@gmail.com"
            subject: "Your Registration OTP",
            html: message,
        };

        // Send the email
        await transporter.sendMail(mailOptions);

        // Return success response
        return res.status(200).json({
            status: 200,
            message: `OTP sent successfully to ${email_id}.`,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release();
    }
};

//get Technician ...
const deleteTechnician = async (req, res) => {
    const { user_id} = req.query;
    const customerId = parseInt(req.params.id);

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        let deleteTechnicianQuery = `DELETE FROM customer_agents WHERE user_id = ? AND customer_id = ?`;
        const deleteTechnicianResult = await connection.query(deleteTechnicianQuery, [user_id, customerId]);

        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "Technician Delete successfully."
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
};

module.exports = {
  createUser,
  login,
  getUsers,
  getUserWma,
  getAgentsWma,
  getTechnicianWma,
  getUser,
  updateUser,
  onStatusChange,
  onChangePassword,
  sendOtp,
  verifyOtp,
  checkEmailId,
  forgotPassword,
  sendOtpIfEmailIdNotExists,
  deleteTechnician
};