# Court Case Management System 👨‍⚖️

A robust and secure court case management system built with TypeScript and Express.js, running on the Internet Computer platform. This system facilitates the management of court cases, hearings, and user roles including judges, lawyers, and court staff.

## Features 🌟

### User Management 👥
- Create, update, and delete user profiles
- Role-based access control (Judge, Lawyer, Court Staff, Litigant)
- Secure password handling with hashing
- Email validation
- Unique username enforcement

### Case Management 📁
- Create and track court cases
- Assign judges and lawyers to cases
- Update case status
- Comprehensive case details storage
- Case filtering by judge or lawyer

### Hearing Management ⚖️
- Schedule court hearings
- Track hearing details (date, location, description)
- View upcoming hearings for judges
- Associate hearings with specific cases and judges

### Security Features 🔒
- Password strength validation
- Secure password hashing
- Input validation
- Role-based access control
- Error handling and validation

## API Endpoints 🛣️

### User Endpoints
```
POST /users - Create new user
PUT /users/:id - Update user
DELETE /users/:id - Delete user
GET /users - Get all users
GET /users/:id - Get user by ID
```

### Case Endpoints
```
POST /cases - Create new case
GET /cases - Get all cases
PUT /cases/:id/status - Update case status
GET /cases/:id - Get case by ID
PUT /cases/:id/judge - Assign judge to case
PUT /cases/:id/lawyers - Assign lawyers to case
GET /judges/:id/cases - Get all cases for a judge
GET /lawyers/:id/cases - Get all cases for a lawyer
```

### Hearing Endpoints
```
POST /hearings - Schedule a hearing
GET /hearings - Get all hearings
GET /hearings/:id - Get hearing by ID
GET /judges/:id/hearings - Get hearings for a judge
GET /judges/:id/upcoming-hearings - Get upcoming hearings for a judge
```

## Data Models 📊

### User Profile
- ID (UUID)
- Username
- Email
- Password (hashed)
- Role
- Created/Updated timestamps

### Case
- ID (UUID)
- Case Number
- Title
- Description
- Status
- Judge ID
- Lawyer IDs
- Created/Updated timestamps

### Hearing
- ID (UUID)
- Case ID
- Judge ID
- Date
- Location
- Description
- Created/Updated timestamps

## Security Requirements 🛡️

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one digit
- At least one special character

## Error Handling ⚠️
The system includes comprehensive error handling for:
- Invalid input data
- Missing required fields
- Duplicate entries
- Invalid roles
- Resource not found
- Server errors

## Installation and Setup 🚀

1. Clone the repository
    ```
    git clone https://github.com/Baddiedev254/muvix.git
    ```
2. Navigate to the project directory
    ```
    cd muvix

    ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the Local Replica
    ```
    dfx start --host 127.0.0.1:8000 --clean --background

    ```
5. Deploy the project locally
    ```
    dfx deploy

    ```

## Dependencies 📦
- uuid
- express
- azle (Internet Computer SDK)

## Contributing 🤝
Contributions are welcome! Please feel free to submit a Pull Request.

## License 📄
This project is licensed under the MIT License - see the LICENSE file for details.

## Support 💬
For support, please create an issue in the repository.