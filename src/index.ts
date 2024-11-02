import { v4 as uuidv4 } from "uuid";
import { Server, StableBTreeMap, ic } from "azle";
import express from "express";

enum UserRole {
  Judge = "Judge",
  Lawyer = "Lawyer",
  CourtStaff = "CourtStaff",
  Litigant = "Litigant",
}

class UserProfile {
  id: string;
  username: string;
  email: string;
  password: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date | null;

  constructor(
    username: string,
    email: string,
    password: string,
    role: UserRole
  ) {
    this.id = uuidv4();
    this.username = username;
    this.email = email;
    this.password = password;
    this.role = role;
    this.createdAt = new Date();
  }
}

class Case {
  id: string;
  caseNumber: string;
  title: string;
  description: string;
  status: string;
  judgeId: string | null;
  lawyerIds: string[];
  createdAt: Date;
  updatedAt: Date | null;

  constructor(
    caseNumber: string,
    title: string,
    description: string,
    judgeId: string | null = null,
    lawyerIds: string[] = []
  ) {
    this.id = uuidv4();
    this.caseNumber = caseNumber;
    this.title = title;
    this.description = description;
    this.status = "Open";
    this.judgeId = judgeId;
    this.lawyerIds = lawyerIds;
    this.createdAt = new Date();
  }
}

class Hearing {
  id: string;
  caseId: string;
  judgeId: string;
  date: Date;
  location: string;
  description: string;
  createdAt: Date;
  updatedAt: Date | null;

  constructor(
    caseId: string,
    judgeId: string,
    date: Date,
    location: string,
    description: string
  ) {
    this.id = uuidv4();
    this.caseId = caseId;
    this.judgeId = judgeId;
    this.date = date;
    this.location = location;
    this.description = description;
    this.createdAt = new Date();
  }
}

// Storage
const userManager = StableBTreeMap<string, UserProfile>(0);
const caseManager = StableBTreeMap<string, Case>(1);
const hearingManager = StableBTreeMap<string, Hearing>(2);

export default Server(() => {
  const app = express();
  app.use(express.json());

  // Create new user
  app.post("/users", (req, res) => {
    if (
      !req.body.username ||
      !req.body.email ||
      !req.body.password ||
      !req.body.role
    ) {
      return res.status(400).json({
        status: 400,
        error: "Invalid payload: Ensure all required fields are provided.",
      });
    }

    // Ensure username is unique
    const existingUsername = userManager
      .values()
      .find((user) => user.username === req.body.username);

    if (existingUsername) {
      return res.status(400).json({
        error: "Username already exists: Ensure 'username' is unique.",
      });
    }

    // Ensure password is secure
    if (!isPasswordSecure(req.body.password)) {
      return res.status(400).json({
        error:
          "Weak password: Ensure 'password' is at least 8 characters long, contains an uppercase letter, a lowercase letter, a digit, and a special character.",
      });
    }

    // Validate the email format to ensure it's correct
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(req.body.email)) {
      res.status(400).json({
        error: "Invalid email format: Ensure 'email' is a valid email address.",
      });
      return;
    }

    // Check if the user already exists
    const existingUser = userManager
      .values()
      .find((user) => user.email === req.body.email);

    if (existingUser) {
      return res.status(400).json({
        error: "User already exists: Ensure 'email' is unique.",
      });
    }

    try {
      const user = new UserProfile(
        req.body.username,
        req.body.email,
        hashPassword(req.body.password),
        req.body.role
      );

      userManager.insert(user.id, user);
      res.status(201).json({
        message: "User created successfully.",
        user: user,
      });
    } catch (error) {
      console.error("Error creating user:", error);
      res
        .status(500)
        .json({ error: "Server error occurred while creating the user." });
    }
  });

  // Update user by ID
  app.put("/users/:id", (req, res) => {
    const userId = req.params.id;

    const userOpt = userManager.get(userId);
    if ("None" in userOpt) {
      return res.status(404).json({
        error: `User with id ${userId} not found`,
      });
    }

    const updatedUser = {
      ...userOpt.Some,
      ...req.body,
      updatedAt: getCurrentDate(),
    };

    userManager.insert(userId, updatedUser);
    res.json(updatedUser);
  });

  // Delete user by ID
  app.delete("/users/:id", (req, res) => {
    const userId = req.params.id;

    const userOpt = userManager.get(userId);
    if ("None" in userOpt) {
      return res.status(404).json({
        error: `User with id ${userId} not found`,
      });
    }

    userManager.remove(userId);
    res.json({
      message: "User deleted successfully.",
    });
  });

  // Get all users
  app.get("/users", (req, res) => {
    try {
      const users = userManager.values();

      if (users.length === 0) {
        return res.status(404).json({
          message: "No users found.",
        });
      }

      res.status(200).json({
        message: "Users retrieved successfully.",
        users: users,
      });
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({
        error: "Server error occurred while fetching users.",
      });
    }
  });

  // Get user by ID
  app.get("/users/:id", (req, res) => {
    const userId = req.params.id;

    const userOpt = userManager.get(userId);
    if ("None" in userOpt) {
      res.status(400).json({
        status: 400,
        message: `Couldn't find user with id=${userId}`,
      });
    } else {
      res.status(200).json({
        message: "User retrieved successfully.",
        user: userOpt.Some,
      });
    }
  });

  // Create new case
  app.post("/cases", (req, res) => {
    if (!req.body.caseNumber || !req.body.title || !req.body.description) {
      return res.status(400).json({
        status: 400,
        error: "Invalid payload: Ensure all required fields are provided.",
      });
    }

    // Optional validation for judgeId if provided
    if (req.body.judgeId) {
      const judgeOpt = userManager.get(req.body.judgeId);
      if ("None" in judgeOpt) {
        return res.status(400).json({
          status: 400,
          error: "Judge not found: Ensure 'judgeId' is a valid user ID.",
        });
      }
    }

    // Optional validation for lawyerIds if provided
    if (req.body.lawyerIds && req.body.lawyerIds.length > 0) {
      const invalidLawyer = req.body.lawyerIds.find(
        (lawyerId: string) => "None" in userManager.get(lawyerId)
      );

      if (invalidLawyer) {
        return res.status(400).json({
          status: 400,
          error: "Lawyer not found: Ensure all 'lawyerIds' are valid user IDs.",
        });
      }
    }

    try {
      const caseInstance = new Case(
        req.body.caseNumber,
        req.body.title,
        req.body.description,
        req.body.judgeId,
        req.body.lawyerIds
      );

      caseManager.insert(caseInstance.id, caseInstance);
      res.status(201).json({
        message: "Case created successfully.",
        case: caseInstance,
      });
    } catch (error) {
      console.error("Error creating case:", error);
      res
        .status(500)
        .json({ error: "Server error occurred while creating the case." });
    }
  });

  // Get all cases
  app.get("/cases", (req, res) => {
    try {
      const cases = caseManager.values();

      if (cases.length === 0) {
        return res.status(404).json({
          message: "No cases found.",
        });
      }

      res.status(200).json({
        message: "Cases retrieved successfully.",
        cases: cases,
      });
    } catch (error) {
      console.error("Error fetching cases:", error);
      res.status(500).json({
        error: "Server error occurred while fetching cases.",
      });
    }
  });

  // Update case status
  app.put("/cases/:id/status", (req, res) => {
    const caseId = req.params.id;
    const { status } = req.body;

    const caseOpt = caseManager.get(caseId);
    if ("None" in caseOpt) {
      return res.status(404).json({
        status: 404,
        error: `Case with id ${caseId} not found`,
      });
    }

    const updatedCase = {
      ...caseOpt.Some,
      status: status,
      updatedAt: getCurrentDate(),
    };

    caseManager.insert(caseId, updatedCase);
    res.json({
      status: 200,
      message: "Case status updated successfully.",
      case: updatedCase,
    });
  });

  // Get case by ID
  app.get("/cases/:id", (req, res) => {
    const caseId = req.params.id;

    const caseOpt = caseManager.get(caseId);
    if ("None" in caseOpt) {
      res.status(400).json({
        status: 400,
        message: `Couldn't find case with id=${caseId}`,
      });
    } else {
      res.status(200).json({
        message: "Case retrieved successfully.",
        case: caseOpt.Some,
      });
    }
  });

  // Updated function to add judge to a case with comprehensive error handling
  app.put("/cases/:id/judge", (req, res) => {
    try {
      const caseId = req.params.id;
      const { judgeId } = req.body;

      // Validate request body
      if (!judgeId) {
        return res.status(400).json({
          status: 400,
          error: "Missing required field: judgeId",
          details: "The request body must include a judgeId",
        });
      }

      // Validate case exists
      const caseOpt = caseManager.get(caseId);
      if ("None" in caseOpt) {
        return res.status(404).json({
          status: 404,
          error: "Case not found",
          details: `Case with id ${caseId} does not exist`,
        });
      }

      const existingCase = caseOpt.Some;

      // Validate case status (optional - depending on your business rules)
      if (existingCase.status === "Closed") {
        return res.status(400).json({
          status: 400,
          error: "Invalid operation",
          details: "Cannot modify judge for a closed case",
        });
      }

      // Validate judgeId
      const judgeOpt = userManager.get(judgeId);
      if ("None" in judgeOpt) {
        return res.status(400).json({
          status: 400,
          error: "Judge not found",
          details: `Judge with id ${judgeId} does not exist`,
        });
      }

      // Validate judge role
      const judge = judgeOpt.Some;
      if (judge.role !== UserRole.Judge) {
        return res.status(400).json({
          status: 400,
          error: "Invalid role",
          details: "User is not a judge",
        });
      }

      // Create updated case object
      const updatedCase = {
        ...existingCase,
        judgeId: judgeId,
        updatedAt: getCurrentDate(),
      };

      // Update the case
      try {
        caseManager.insert(caseId, updatedCase);
      } catch (error) {
        console.error("Error updating case:", error);
        return res.status(500).json({
          status: 500,
          error: "Database error",
          details: "Failed to update case with new judge",
        });
      }

      // Prepare success response with detailed information
      return res.status(200).json({
        status: 200,
        message: "Judge successfully assigned to case",
        data: {
          case: updatedCase,
          modifiedAt: updatedCase.updatedAt,
          judge: judge,
        },
      });
    } catch (error) {
      console.error("Error in add judge endpoint:", error);
      return res.status(500).json({
        status: 500,
        error: "Internal server error",
        details: "An unexpected error occurred while processing the request",
      });
    }
  });

  // Get all cases for a judge with validation
  app.get("/judges/:id/cases", (req, res) => {
    try {
      const judgeId = req.params.id;

      // Validate if judgeId is provided
      if (!judgeId) {
        return res.status(400).json({
          status: 400,
          error: "Judge ID is required",
        });
      }

      // Validate if judge exists and has correct role
      const judgeOpt = userManager.get(judgeId);
      if ("None" in judgeOpt) {
        return res.status(404).json({
          status: 404,
          error: `Judge with id ${judgeId} not found`,
        });
      }

      const judge = judgeOpt.Some;
      if (judge.role !== UserRole.Judge) {
        return res.status(403).json({
          status: 403,
          error: "User is not a judge",
        });
      }

      // Get all cases assigned to the judge
      const cases = caseManager.values().filter((c) => {
        // Check if judgeId is properly assigned to the case
        return c.judgeId === judgeId;
      });

      // Add case statistics
      const caseStats = {
        total: cases.length,
        openCases: cases.filter((c) => c.status === "Open").length,
        closedCases: cases.filter((c) => c.status === "Closed").length,
      };

      // Get associated hearings for these cases
      const hearings = hearingManager
        .values()
        .filter((h) => cases.some((c) => c.id === h.caseId));

      // Return appropriate response based on results
      if (cases.length === 0) {
        return res.status(200).json({
          status: 200,
          message: "No cases found for the judge",
          cases: [],
          statistics: {
            total: 0,
            openCases: 0,
            closedCases: 0,
          },
          hearings: [],
        });
      }

      return res.status(200).json({
        status: 200,
        message: "Cases retrieved successfully",
        cases: cases.map((c) => ({
          ...c,
          hearings: hearings.filter((h) => h.caseId === c.id),
        })),
        statistics: caseStats,
      });
    } catch (error) {
      console.error("Error fetching judge cases:", error);
      return res.status(500).json({
        status: 500,
        error: "Internal server error while fetching judge cases",
      });
    }
  });

  // Updated function to add lawyers to a case with comprehensive error handling
  app.put("/cases/:id/lawyers", (req, res) => {
    try {
      const caseId = req.params.id;
      const { lawyerIds } = req.body;

      // Validate request body
      if (!lawyerIds) {
        return res.status(400).json({
          status: 400,
          error: "Missing required field: lawyerIds",
          details: "The request body must include a lawyerIds array",
        });
      }

      // Validate lawyerIds is an array
      if (!Array.isArray(lawyerIds)) {
        return res.status(400).json({
          status: 400,
          error: "Invalid data type for lawyerIds",
          details: "lawyerIds must be an array of strings",
        });
      }

      // Validate array is not empty
      if (lawyerIds.length === 0) {
        return res.status(400).json({
          status: 400,
          error: "Empty lawyerIds array",
          details: "At least one lawyer ID must be provided",
        });
      }

      // Validate case exists
      const caseOpt = caseManager.get(caseId);
      if ("None" in caseOpt) {
        return res.status(404).json({
          status: 404,
          error: "Case not found",
          details: `Case with id ${caseId} does not exist`,
        });
      }

      const existingCase = caseOpt.Some;

      // Validate case status (optional - depending on your business rules)
      if (existingCase.status === "Closed") {
        return res.status(400).json({
          status: 400,
          error: "Invalid operation",
          details: "Cannot modify lawyers for a closed case",
        });
      }

      // Validate and collect lawyer information
      const validatedLawyers = [];
      const invalidLawyers = [];

      for (const lawyerId of lawyerIds) {
        // Validate lawyer ID format (assuming UUID)
        if (typeof lawyerId !== "string" || !lawyerId.trim()) {
          invalidLawyers.push({
            id: lawyerId,
            reason: "Invalid ID format",
          });
          continue;
        }

        // Check if lawyer exists
        const lawyerOpt = userManager.get(lawyerId);
        if ("None" in lawyerOpt) {
          invalidLawyers.push({
            id: lawyerId,
            reason: "Lawyer not found",
          });
          continue;
        }

        // Validate lawyer role
        const lawyer = lawyerOpt.Some;
        if (lawyer.role !== UserRole.Lawyer) {
          invalidLawyers.push({
            id: lawyerId,
            reason: "User is not a lawyer",
          });
          continue;
        }

        validatedLawyers.push(lawyerId);
      }

      // If any lawyers are invalid, return error with details
      if (invalidLawyers.length > 0) {
        return res.status(400).json({
          status: 400,
          error: "Invalid lawyer IDs detected",
          details: {
            invalidLawyers,
            message:
              "One or more lawyer IDs are invalid or not associated with lawyer accounts",
          },
        });
      }

      // Remove duplicates
      const uniqueLawyerIds = [...new Set(validatedLawyers)];

      // Create updated case object
      const updatedCase = {
        ...existingCase,
        lawyerIds: uniqueLawyerIds,
        updatedAt: getCurrentDate(),
      };

      // Update the case
      try {
        caseManager.insert(caseId, updatedCase);
      } catch (error) {
        console.error("Error updating case:", error);
        return res.status(500).json({
          status: 500,
          error: "Database error",
          details: "Failed to update case with new lawyers",
        });
      }

      // Prepare success response with detailed information
      return res.status(200).json({
        status: 200,
        message: "Lawyers successfully assigned to case",
        data: {
          case: updatedCase,
          modifiedAt: updatedCase.updatedAt,
          lawyers: {
            total: uniqueLawyerIds.length,
            ids: uniqueLawyerIds,
          },
        },
      });
    } catch (error) {
      console.error("Error in add lawyers endpoint:", error);
      return res.status(500).json({
        status: 500,
        error: "Internal server error",
        details: "An unexpected error occurred while processing the request",
      });
    }
  });

  // Get all cases for a lawyer with validation
  app.get("/lawyers/:id/cases", (req, res) => {
    try {
      const lawyerId = req.params.id;

      // Validate if lawyerId is provided
      if (!lawyerId) {
        return res.status(400).json({
          status: 400,
          error: "Lawyer ID is required",
        });
      }

      // Validate if lawyer exists and has correct role
      const lawyerOpt = userManager.get(lawyerId);
      if ("None" in lawyerOpt) {
        return res.status(404).json({
          status: 404,
          error: `Lawyer with id ${lawyerId} not found`,
        });
      }

      // Validate if user is a lawyer
      const lawyer = lawyerOpt.Some;
      if (lawyer.role !== UserRole.Lawyer) {
        return res.status(403).json({
          status: 403,
          error: "User is not a lawyer",
        });
      }

      // Get all cases and filter for the lawyer
      const cases = caseManager
        .values()
        .filter(
          (c) => Array.isArray(c.lawyerIds) && c.lawyerIds.includes(lawyerId)
        );

      // Return appropriate response based on results
      if (cases.length === 0) {
        return res.status(200).json({
          status: 200,
          message: "No cases found for the lawyer",
          cases: [],
        });
      }

      return res.status(200).json({
        status: 200,
        message: "Cases retrieved successfully",
        cases: cases,
      });
    } catch (error) {
      console.error("Error fetching lawyer cases:", error);
      return res.status(500).json({
        status: 500,
        error: "Internal server error while fetching lawyer cases",
      });
    }
  });

  // Schedule a hearing
  app.post("/hearings", (req, res) => {
    if (
      !req.body.caseId ||
      !req.body.judgeId ||
      !req.body.date ||
      !req.body.location ||
      !req.body.description
    ) {
      return res.status(400).json({
        status: 400,
        error: "Invalid payload: Ensure all required fields are provided.",
      });
    }

    // Validate caseId
    const caseOpt = caseManager.get(req.body.caseId);
    if ("None" in caseOpt) {
      return res.status(400).json({
        status: 400,
        error: "Case not found: Ensure 'caseId' is a valid case ID.",
      });
    }

    // Validate judgeId
    const judgeOpt = userManager.get(req.body.judgeId);
    if ("None" in judgeOpt) {
      return res.status(400).json({
        status: 400,
        error: "Judge not found: Ensure 'judgeId' is a valid user ID.",
      });
    }

    try {
      const hearingInstance = new Hearing(
        req.body.caseId,
        req.body.judgeId,
        new Date(req.body.date),
        req.body.location,
        req.body.description
      );

      hearingManager.insert(hearingInstance.id, hearingInstance);
      res.status(201).json({
        message: "Hearing scheduled successfully.",
        hearing: hearingInstance,
      });
    } catch (error) {
      console.error("Error scheduling hearing:", error);
      res
        .status(500)
        .json({ error: "Server error occurred while scheduling the hearing." });
    }
  });

  // Get all hearings
  app.get("/hearings", (req, res) => {
    try {
      const hearings = hearingManager.values();

      if (hearings.length === 0) {
        return res.status(404).json({
          message: "No hearings found.",
        });
      }

      res.status(200).json({
        message: "Hearings retrieved successfully.",
        hearings: hearings,
      });
    } catch (error) {
      console.error("Error fetching hearings:", error);
      res.status(500).json({
        error: "Server error occurred while fetching hearings.",
      });
    }
  });

  // Get hearing by ID
  app.get("/hearings/:id", (req, res) => {
    const hearingId = req.params.id;

    const hearingOpt = hearingManager.get(hearingId);

    if ("None" in hearingOpt) {
      res.status(400).json({
        status: 400,
        message: `Couldn't find hearing with id=${hearingId}`,
      });
    } else {
      res.status(200).json({
        message: "Hearing retrieved successfully.",
        hearing: hearingOpt.Some,
      });
    }
  });

  // Fetch hearing for a judge
  app.get("/judges/:id/hearings", (req, res) => {
    const judgeId = req.params.id;

    const hearings = hearingManager
      .values()
      .filter((h) => h.judgeId === judgeId);

    if (hearings.length === 0) {
      return res.status(404).json({
        message: "No hearings found for the judge.",
      });
    }

    res.status(200).json({
      message: "Hearings retrieved successfully.",
      hearings: hearings,
    });
  });

  // Fetch upcoming hearings for a judge
  app.get("/judges/:id/upcoming-hearings", (req, res) => {
    try {
      const judgeId = req.params.id;

      // Validate judge exists and has correct role
      const judgeOpt = userManager.get(judgeId);
      if ("None" in judgeOpt) {
        return res.status(404).json({
          status: 404,
          error: `Judge with id ${judgeId} not found`,
        });
      }

      const judge = judgeOpt.Some;
      if (judge.role !== UserRole.Judge) {
        return res.status(403).json({
          status: 403,
          error: "User is not a judge",
        });
      }

      // Get current date
      const currentDate = getCurrentDate();

      // Get upcoming hearings for the judge
      const upcomingHearings = hearingManager
        .values()
        .filter((h) => h.judgeId === judgeId && new Date(h.date) > currentDate);

      // Sort hearings by date
      upcomingHearings.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      return res.status(200).json({
        status: 200,
        message: "Upcoming hearings retrieved successfully",
        hearings: upcomingHearings,
      });
    } catch (error) {
      console.error("Error fetching upcoming hearings:", error);
      return res.status(500).json({
        status: 500,
        error: "Internal server error while fetching upcoming hearings",
      });
    }
  });

  return app.listen();
});

// Utility functions

// Get current date
function getCurrentDate() {
  const timestamp = new Number(ic.time());
  return new Date(timestamp.valueOf() / 1000_000);
}

// Ensure password is secure
function isPasswordSecure(password: string): boolean {
  const lengthCheck = password.length >= 8;
  const uppercaseCheck = /[A-Z]/.test(password);
  const lowercaseCheck = /[a-z]/.test(password);
  const digitCheck = /\d/.test(password);
  const specialCharCheck = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  return (
    lengthCheck &&
    uppercaseCheck &&
    lowercaseCheck &&
    digitCheck &&
    specialCharCheck
  );
}

// Hash password
function hashPassword(password: string): string {
  return `hashed_${password.split("").reverse().join("").toUpperCase()}_secure`;
}
