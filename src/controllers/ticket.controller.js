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
    const remark = req.body.remark ? req.body.remark.trim() :'';

    const assigned_at = req.body.assigned_at ? req.body.assigned_at : '';
    const remarks = req.body.remarks ? req.body.remarks.trim() :'';
    const message = req.body.message ? req.body.message.trim() :'';
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
        
        const insertTicketAssignedQuery = "INSERT INTO ticket_assignments (ticket_id, assigned_to, assigned_by, assigned_at, remark)VALUES(?, ?, ?, ?, ?)";
        const insertTicketAssignedResult = await connection.query(insertTicketAssignedQuery,[ticket_id, assigned_to, user_id, assigned_at, remark]);

        let insertTicketStatusHistoryQuery = 'INSERT INTO  ticket_conversations(ticket_id, sender_id, message) VALUES (?, ?, ?)';
        let insertTicketStatusHistoryValues = [ ticket_id, user_id, message ];
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
        const remark = req.body.remark ? req.body.remark.trim() :'';

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
        
        const updateTicketAssignedQuery = "UPDATE ticket_assignments SET ticket_id = ?, assigned_to = ?, assigned_by = ?, assigned_at = ?, remark = ? WHERE ticket_id = ?";
        const updateTicketAssignedResult = await connection.query(updateTicketAssignedQuery,[ticketId, assigned_to, user_id, assigned_at, remark, ticketId]);

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
    const { page, perPage, key } = req.query;

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        let getTicketsQuery = `SELECT t.*, ta.assigned_to, ta.assigned_by, ta.assigned_at, ta.remark, att.file_path, att.uploaded_by, u.user_name, tc.name, p.name AS priority_name, d.department_name,
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
        getTicketsQuery += " ORDER BY created_at DESC";

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

        const ticketQuery = `SELECT t.*, ta.assigned_to, ta.assigned_by, ta.assigned_at, ta.remark, att.file_path, att.uploaded_by, u.user_name, tc.name, p.name AS priority_name, d.department_name,
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

module.exports = {
  createTicket,
  updateTicket,
  getAllTickets,
  getTicket
};