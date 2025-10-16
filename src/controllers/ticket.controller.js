const pool = require("../../db");
const fs = require('fs');
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

//create ticket
const createTicket = async (req, res)=>{
    const ticket_category_id = req.body.ticket_category_id ? req.body.ticket_category_id :'';
    const priority_id = req.body.priority_id ? req.body.priority_id :'';
    const department_id = req.body.department_id ? req.body.department_id :'';
    const subject = req.body.subject ? req.body.subject.trim() :'';
    const description = req.body.description ? req.body.description.trim() :'';
    const ticket_status = req.body.ticket_status ? req.body.ticket_status.trim() : null;
    const closed_at = req.body.closed_at ? req.body.closed_at.trim(): null;
    const ticket_conversation_id = req.body.ticket_conversation_id ? req.body.ticket_conversation_id : null;
    const base64PDF = req.body.file_path ? req.body.file_path.trim() :'';
    const assigned_to = req.body.assigned_to ? req.body.assigned_to : '';
    // const remark = req.body.remark ? req.body.remark.trim() :'';
    const assigned_at = req.body.assigned_at ? req.body.assigned_at : '';
    const remarks = req.body.remarks ? req.body.remarks.trim() :'';
    // const message = req.body.message ? req.body.message.trim() :'';
    const old_status = req.body.old_status ? req.body.old_status : null;
    const new_status = req.body.new_status ? req.body.new_status : '';

    const user_id = req.companyData.user_id;

    if (!subject) {
        return error422("Subject is required.", res);
    }  

    let connection = await getConnection();

    try {
        // start the transaction
        await connection.beginTransaction();
        const [rows] = await connection.query(`
            SELECT ticket_no 
            FROM tickets 
            ORDER BY ticket_id DESC 
            LIMIT 1
        `);

        let ticket_no = 'TCK-1'; // default first ticket number

        if (rows.length > 0) {
            const lastTicketNo = rows[0].ticket_no; // e.g., "TCK-12"
            const lastNumber = parseInt(lastTicketNo.split('-')[1], 10);
            ticket_no = `TCK-${lastNumber + 1}`;
        }

        const closedAtQuery = `SELECT * FROM ticket_status_history WHERE LOWER(TRIM(new_status)) = "close" `;
        const closedAtResult = await pool.query(closedAtQuery);
        const closed_at = closedAtResult[0].cts;

        const insertTicketQuery = "INSERT INTO tickets (ticket_no, user_id, ticket_category_id, priority_id, department_id, subject, description, ticket_status, closed_at)VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)";
        const insertTicketResult = await connection.query(insertTicketQuery,[ticket_no, user_id, ticket_category_id, priority_id, department_id, subject, description, ticket_status, closed_at]);
        const ticket_id = insertTicketResult[0].insertId

        
      const cleanedBase64 = base64PDF.replace(/^data:.*;base64,/, "");
const pdfBuffer = Buffer.from(cleanedBase64, "base64");

const uploadsDir = path.join(__dirname, "..", "..", "uploads");
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const fileName = `ticket_${ticket_id}_${Date.now()}.pdf`;
const filePath = path.join(uploadsDir, fileName);

fs.writeFileSync(filePath, pdfBuffer);

const dbFilePath = `uploads/${fileName}`;
        const insertTicketAttachmentQuery = "INSERT INTO ticket_attachments (ticket_id, ticket_conversation_id, file_path, uploaded_by)VALUES(?, ?, ?, ?)";
        const insertTicketAttachmentResult = await connection.query(insertTicketAttachmentQuery,[ticket_id, ticket_conversation_id, dbFilePath, user_id]);

        // //assigned
        // const assignedQuery = "SELECT * FROM users WHERE user_id = ? ";
        // const assignedResult = await pool.query(assignedQuery, [assigned_to]);
        // if (assignedResult[0].length == 0) {
        //   return error422("User Not Found.", res);
        // }
        
        const insertTicketAssignedQuery = "INSERT INTO ticket_assignments (ticket_id, assigned_to, assigned_by, assigned_at, remarks)VALUES(?, ?, ?, ?, ?)";
        const insertTicketAssignedResult = await connection.query(insertTicketAssignedQuery,[ticket_id, assigned_to, user_id, assigned_at, remarks]);

        let insertTicketStatusHistoryQuery = 'INSERT INTO  ticket_conversations(ticket_id, sender_id, message) VALUES (?, ?, ?)';
        let insertTicketStatusHistoryValues = [ ticket_id, user_id, description ];
        let insertTicketStatusHistoryResult = await connection.query(insertTicketStatusHistoryQuery, insertTicketStatusHistoryValues);

      
        let insertTicketConversationQuery = 'INSERT INTO ticket_status_history (ticket_id, old_status, new_status, changed_by, remarks) VALUES (?, ?, ?, ?, ?)';
        let insertTicketConversationValues = [ ticket_id, old_status, ticket_status, user_id, remarks];
        let insertTicketConversationResult = await connection.query(insertTicketConversationQuery, insertTicketConversationValues);
        
    
        await connection.commit()
        return res.status(200).json({
            status:200,
            message:"Ticket created successfully."
        })
    } catch (error) {
      
        return error500(error, res);
    } finally{
        if (connection) connection.release();
    }
}

//Update ticket
const updateTicket = async (req, res) => {
    const ticketId = parseInt(req.params.id);
    const ticket_category_id = req.body.ticket_category_id ? req.body.ticket_category_id :'';
    const priority_id = req.body.priority_id ? req.body.priority_id :'';
    const department_id = req.body.department_id ? req.body.department_id :'';
    const subject = req.body.subject ? req.body.subject.trim() :'';
    const description = req.body.description ? req.body.description.trim() :'';
    const ticket_status = req.body.ticket_status ? req.body.ticket_status.trim() : null;
    const closed_at = req.body.closed_at ? req.body.closed_at.trim(): null;
    const ticket_conversation_id = req.body.ticket_conversation_id ? req.body.ticket_conversation_id : null;
    const base64PDF = req.body.file_path ? req.body.file_path.trim() :'';
    const assigned_to = req.body.assigned_to ? req.body.assigned_to : '';
        // const remark = req.body.remark ? req.body.remark.trim() :'';

    const assigned_at = req.body.assigned_at ? req.body.assigned_at : '';
    const remarks = req.body.remarks ? req.body.remarks.trim() :'';
    const message = req.body.message ? req.body.message.trim() :'';
        const user_id = req.companyData.user_id;

    // const old_status = req.body.old_status ? req.body.old_status : null;
    if (!subject) {
        return error422("Subject is required.", res);
    }

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        // Check if ticket exists
        const ticketQuery = "SELECT * FROM tickets WHERE ticket_id  = ?";
        const ticketResult = await connection.query(ticketQuery, [ticketId]);
        if (ticketResult[0].length == 0) {
            return error422("Ticket Not Found.", res);
        }
        
        // Update the ticket record with new data
        const updateQuery = `
            UPDATE tickets
            SET user_id = ?, ticket_category_id = ?, priority_id = ?, department_id = ?, subject = ?, description = ?, ticket_status = ?, closed_at = ?
            WHERE ticket_id = ?
        `;
        await connection.query(updateQuery, [ user_id, ticket_category_id, priority_id, department_id, subject, description, ticket_status, closed_at, ticketId]);


        const cleanedBase64 = base64PDF.replace(/^data:.*;base64,/, "");
        const pdfBuffer = Buffer.from(cleanedBase64, "base64");

        const uploadsDir = path.join(__dirname, "..", "..", "uploads");
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const fileName = `ticket_${ticketId}_${Date.now()}.pdf`;
        const filePath = path.join(uploadsDir, fileName);

        fs.writeFileSync(filePath, pdfBuffer);

        const dbFilePath = `uploads/${fileName}`;
        const updateTicketAttachmentQuery = "UPDATE ticket_attachments SET ticket_id = ?, ticket_conversation_id = ?, file_path = ?, uploaded_by = ? WHERE ticket_id = ?";
        const updateTicketAttachmentResult = await connection.query(updateTicketAttachmentQuery,[ticketId, ticket_conversation_id, dbFilePath, user_id, ticketId]);

        // //assigned
        // const assignedQuery = "SELECT * FROM users WHERE user_id = ? ";
        // const assignedResult = await pool.query(assignedQuery, [assigned_to]);
        // if (assignedResult[0].length == 0) {
        //   return error422("User Not Found.", res);
        // }
        
        const updateTicketAssignedQuery = "UPDATE ticket_assignments SET ticket_id = ?, assigned_to = ?, assigned_by = ?, assigned_at = ?, remarks = ? WHERE ticket_id = ?";
        const updateTicketAssignedResult = await connection.query(updateTicketAssignedQuery,[ticketId, assigned_to, user_id, assigned_at, remarks, ticketId]);

        let insertTicketStatusHistoryQuery = 'INSERT INTO ticket_conversations(ticket_id, sender_id, message) VALUES (?, ?, ?)';
        let insertTicketStatusHistoryValues = [ ticketId, user_id, message ];
        let insertTicketStatusHistoryResult = await connection.query(insertTicketStatusHistoryQuery, insertTicketStatusHistoryValues);

        const selectTicketStatusHistoryQuery = "SELECT *  FROM ticket_status_history WHERE ticket_id = ? ORDER BY cts DESC";
        const [selectTicketStatusHistoryResult] = await connection.query(selectTicketStatusHistoryQuery, [ticketId]);
        const old_status = selectTicketStatusHistoryResult[0].new_status;
        

        let insertTicketConversationQuery = 'INSERT INTO ticket_status_history (ticket_id, old_status, new_status, changed_by, remarks) VALUES (?, ?, ?, ?, ?)';
        let insertTicketConversationValues = [ ticketId, old_status, ticket_status, user_id, remarks];
        let insertTicketConversationResult = await connection.query(insertTicketConversationQuery, insertTicketConversationValues);
        
        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "Ticket updated successfully.",
        });
    } catch (error) {

        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

//all tickets list
const getAllTickets = async (req, res) => {
    const { page, perPage, key, user_id } = req.query;

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        let getTicketsQuery = `SELECT t.*, ta.assigned_to, ta.assigned_by, ta.assigned_at, ta.remarks, att.file_path, att.uploaded_by, u.user_name, tc.name, p.name AS priority_name, d.department_name,
        u1.user_name AS assigned_to_name, u2.user_name AS assigned_by_name, u3.user_name AS uploaded_by_name
        FROM tickets t 
        LEFT JOIN ticket_assignments ta ON ta.ticket_id = t.ticket_id
        LEFT JOIN ticket_attachments att ON att.ticket_id = t.ticket_id
        LEFT JOIN users u ON u.user_id = t.user_id
        LEFT JOIN ticket_categories tc ON tc.ticket_category_id = t.ticket_category_id
        LEFT JOIN priorities p ON p.priority_id = t.priority_id
        LEFT JOIN departments d ON d.department_id = t.department_id
        LEFT JOIN users u1 ON u1.user_id = ta.assigned_to
        LEFT JOIN users u2 ON u2.user_id = ta.assigned_by
        LEFT JOIN users u3 ON u3.user_id = att.uploaded_by 
        WHERE 1`;

        let countQuery = `SELECT COUNT(*) AS total FROM tickets t
        
        LEFT JOIN ticket_assignments ta ON ta.ticket_id = t.ticket_id
        LEFT JOIN ticket_attachments att ON att.ticket_id = t.ticket_id
        LEFT JOIN users u ON u.user_id = t.user_id
        LEFT JOIN ticket_categories tc ON tc.ticket_category_id = t.ticket_category_id
        LEFT JOIN priorities p ON p.priority_id = t.priority_id
        LEFT JOIN departments d ON d.department_id = t.department_id
        LEFT JOIN users u1 ON u1.user_id = ta.assigned_to
        LEFT JOIN users u2 ON u2.user_id = ta.assigned_by
        LEFT JOIN users u3 ON u3.user_id = att.uploaded_by 
        WHERE 1`;

        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            if (lowercaseKey === "activated") {
                getTicketsQuery += ` AND status = 1`;
                countQuery += ` AND status = 1`;
            } else if (lowercaseKey === "deactivated") {
                getTicketsQuery += ` AND status = 0`;
                countQuery += ` AND status = 0`;
            } else {
                getTicketsQuery += ` AND LOWER(department_name) LIKE '%${lowercaseKey}%' `;
                countQuery += ` AND LOWER(department_name) LIKE '%${lowercaseKey}%' `;
            }
        }

        if (user_id) {
            getTicketsQuery += ` AND ta.assigned_to = ${user_id}`;
            countQuery += ` AND ta.assigned_to = ${user_id}`;
        }
        getTicketsQuery += " ORDER BY t.created_at DESC";

        // Apply pagination if both page and perPage are provided
        let total = 0;
        if (page && perPage) {
            const totalResult = await connection.query(countQuery);
            total = parseInt(totalResult[0][0].total);

            const start = (page - 1) * perPage;
            getTicketsQuery += ` LIMIT ${perPage} OFFSET ${start}`;
        }

        const result = await connection.query(getTicketsQuery);
        const tickets = result[0];

        // Commit the transaction
        await connection.commit();
        const data = {
            status: 200,
            message: "Tickets retrieved successfully",
            data: tickets,
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

//Ticket list by id
const getTicket = async (req, res) => {
    const ticketId = parseInt(req.params.id);
    
    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        const ticketQuery = `SELECT t.*, ta.assigned_to, ta.assigned_by, ta.assigned_at, ta.remarks, att.file_path, att.uploaded_by, u.user_name, tc.name, p.name AS priority_name, d.department_name,
        u1.user_name AS assigned_to_name, u2.user_name AS assigned_by_name, u3.user_name AS uploaded_by_name
        FROM tickets t 
        LEFT JOIN ticket_assignments ta ON ta.ticket_id = t.ticket_id
        LEFT JOIN ticket_attachments att ON att.ticket_id = t.ticket_id
        LEFT JOIN users u ON u.user_id = t.user_id
        LEFT JOIN ticket_categories tc ON tc.ticket_category_id = t.ticket_category_id
        LEFT JOIN priorities p ON p.priority_id = t.priority_id
        LEFT JOIN departments d ON d.department_id = t.department_id
        LEFT JOIN users u1 ON u1.user_id = ta.assigned_to
        LEFT JOIN users u2 ON u2.user_id = ta.assigned_by
        LEFT JOIN users u3 ON u3.user_id = att.uploaded_by
        WHERE t.ticket_id = ?`;
        const ticketResult = await connection.query(ticketQuery, [ticketId]);
        if (ticketResult[0].length == 0) {
            return error422("ticket Not Found.", res);
        }
        
        const ticket = ticketResult[0][0];

        // get ticket status history
        let ticketStatusHistoryQuery = `SELECT tsh.*, u.user_name FROM ticket_status_history tsh 
        LEFT JOIN users u ON u.user_id = tsh.changed_by 
        WHERE tsh.ticket_id = ?`
        let ticketStatusHistoryResult = await connection.query(ticketStatusHistoryQuery, [ticketId]);
        ticket["ticketStatusHistory"] = ticketStatusHistoryResult[0];
        

        return res.status(200).json({
            status: 200,
            message: "Ticket Retrived Successfully",
            data: ticket
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

//dashboard ticket status count
const getTicketStatusCount = async (req, res) => {
    const { user_id, assigned_to } = req.query;
    let connection = await getConnection();

    try {
        await connection.beginTransaction();

        let ticket_status_total_count = 0;
          

        // Step 1: Get total count of all tickets (with filters if needed)
        let totalCountQuery = `
            SELECT COUNT(*) AS total 
            FROM tickets 
            WHERE 1
        `;
        const totalCountResult = await connection.query(totalCountQuery);
        ticket_status_total_count = parseInt(totalCountResult[0][0].total);

        const [statusCountResult] = await connection.query(`
            SELECT 
                ticket_status,
                COUNT(*) AS count
            FROM tickets
           
            GROUP BY ticket_status
        `);
        // Step 4: Default statuses
        const defaultStatuses = ["Open", "In Progress", "On Hold", "Resolved", "Closed"];

        // Step 5: Build consistent array
        const ticket_status_counts = defaultStatuses.map(status => {
            const found = statusCountResult.find(row => row.ticket_status === status);
            return {
                ticket_status: status,
                count: found ? parseInt(found.count) : 0
            };
        });

        // Step 6: Response
        const data = {
            status: 200,
            message: "Ticket dashboard status count retrieved successfully",
            ticket_status_total_count,
            ticket_status_counts
        };
        await connection.commit();
        return res.status(200).json(data);

    } catch (error) {
        await connection.rollback();
        return error500(error, res);
    } finally {
        await connection.release();
    }
};


const getMonthWiseStatusCount = async (req, res) => {
    const { user_id, assigned_to } = req.query;

    const currentDate = new Date();
    const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1); // 1st of the month
    const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0); // Last day of the month

    // Use local YYYY-MM-DD format correctly

    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const formattedStartDate = formatDate(startDate);
    const formattedEndDate = formatDate(endDate);

    let connection = await getConnection();

    try {
        await connection.beginTransaction();

        // Fetch open and close status counts grouped by date
        let statusCountQuery = `
        SELECT 
          DATE(t.created_at) AS date,
          COUNT(CASE WHEN t.ticket_status = "Open" THEN 1 END) AS open_count,
          COUNT(CASE WHEN t.ticket_status = "Close" THEN 1 END) AS completed_count
        FROM tickets t
        WHERE DATE(t.created_at) BETWEEN ? AND ?`;

        // if (user_id) {
        //     statusCountQuery += ` AND (th.user_id = ${user_id} OR tf.assigned_to = ${user_id})`;
        // }

        statusCountQuery += ` GROUP BY DATE(t.created_at) ORDER BY DATE(t.created_at)`;

        const [statusCounts] = await connection.query(statusCountQuery, [formattedStartDate, formattedEndDate]);

        // Create a list of all dates in the current month
        const allDatesInMonth = [];

        let dateIterator = new Date(startDate);

        while (dateIterator <= endDate) {
            allDatesInMonth.push(formatDate(dateIterator));
            dateIterator.setDate(dateIterator.getDate() + 1);
        }

        // Map query result

        const statusCountMap = {};

        statusCounts.forEach(row => {

            const formattedRowDate = formatDate(new Date(row.date));

            statusCountMap[formattedRowDate] = {

                open_count: row.open_count,

                close_count: row.completed_count

            };

        });

        const finalResult = allDatesInMonth.map(date => {
            const counts = statusCountMap[date] || { open_count: 0, close_count: 0 };
            return {
                date,
                open_count: counts.open_count,
                close_count: counts.close_count
            };
        });


        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: "Date-wise open and close status counts retrieved successfully",
            data: finalResult,
        });

    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release();
    }
};

//today open ticket list
const getTodayOpenTicketList = async (req, res) => {
    const newDate = new Date() // Current timestamp
    const { page, perPage, key, user_id, employee_id } = req.query;
    
    let connection = await getConnection();

    try {
        // Start a transaction
        await connection.beginTransaction();

        let todayOpenTicketQuery = `SELECT t.*, u.user_name, tc.name, p.name AS priority_name, d.department_name
        FROM tickets t 
        LEFT JOIN ticket_assignments ta ON ta.ticket_id = t.ticket_id
        LEFT JOIN ticket_attachments att ON att.ticket_id = t.ticket_id
        LEFT JOIN users u ON u.user_id = t.user_id
        LEFT JOIN ticket_categories tc ON tc.ticket_category_id = t.ticket_category_id
        LEFT JOIN priorities p ON p.priority_id = t.priority_id
        LEFT JOIN departments d ON d.department_id = t.department_id
        WHERE 1 AND t.ticket_status = "open" AND DATE(t.created_at) = ?`;

        let countQuery = `SELECT COUNT(*) AS total FROM tickets t
LEFT JOIN ticket_assignments ta ON ta.ticket_id = t.ticket_id
        LEFT JOIN ticket_attachments att ON att.ticket_id = t.ticket_id
        LEFT JOIN users u ON u.user_id = t.user_id
        LEFT JOIN ticket_categories tc ON tc.ticket_category_id = t.ticket_category_id
        LEFT JOIN priorities p ON p.priority_id = t.priority_id
        LEFT JOIN departments d ON d.department_id = t.department_id
        WHERE 1 AND t.ticket_status = "open" AND DATE(t.created_at) = ?`;

        // if (key) {
        //     const lowercaseKey = key.toLowerCase().trim();
        //     todayTaskListQuery += ` AND (LOWER(tf.task_details) LIKE '%${lowercaseKey}%' || LOWER(th.task_title) LIKE '%${lowercaseKey}%' || LOWER(u.first_name) LIKE '%${lowercaseKey}%' || LOWER(u.last_name) LIKE '%${lowercaseKey}%' || LOWER(p.project_name) LIKE '%${lowercaseKey}%' || LOWER(s.status_name) LIKE '%${lowercaseKey}%')`;
        //     countQuery += ` AND (LOWER(tf.task_details) LIKE '%${lowercaseKey}%' || LOWER(th.task_title) LIKE '%${lowercaseKey}%' || LOWER(u.first_name) LIKE '%${lowercaseKey}%' || LOWER(u.last_name) LIKE '%${lowercaseKey}%' || LOWER(p.project_name) LIKE '%${lowercaseKey}%' || LOWER(s.status_name) LIKE '%${lowercaseKey}%')`;
        // }

        // if (user_id) {
        //     todayTaskListQuery += ` AND th.employee_id = ${user_id}`;
        //     countQuery += `  AND th.employee_id = ${user_id}`;
        // }

        todayOpenTicketQuery += " ORDER BY t.created_at DESC";

        let total = 0;
        if (page && perPage) {
            const totalResult = await connection.query(countQuery, [newDate.toISOString().split('T')[0]]);
            total = parseInt(totalResult[0][0].total);
            const start = (page - 1) * perPage;
            todayOpenTicketQuery += ` LIMIT ${perPage} OFFSET ${start}`;
        }
        let todayOpenTicketResult = await connection.query(todayOpenTicketQuery, [newDate.toISOString().split('T')[0]]);

        const data = {
            status: 200,
            message: "Today Open Ticket retrieved successfully",
            data: todayOpenTicketResult[0]
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
      console.log(error);
      
        return error500(error, res);
    } finally {
        if (connection) connection.release()

    }
};
module.exports = {
  createTicket,
  updateTicket,
  getAllTickets,
  getTicket,
  getTicketStatusCount,
  getMonthWiseStatusCount,
  getTodayOpenTicketList
};