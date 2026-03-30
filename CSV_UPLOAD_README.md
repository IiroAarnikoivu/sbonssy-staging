# CSV User Upload System

This system allows bulk import of users from CSV files into both Supabase (authentication) and MongoDB (profile data).

## Features

- ✅ Bulk user creation in Supabase and MongoDB
- ✅ Password set to email address for all users
- ✅ Email verification set to false (users need to verify manually)
- ✅ Automatic role and subRole assignment based on userType
- ✅ Comprehensive error handling and reporting
- ✅ Progress tracking and detailed results
- ✅ Error report download functionality

## Usage

1. Navigate to `/admin/csv-upload` in your application
2. Upload a CSV file with the required format
3. Review the results and download error reports if needed

## CSV Format Requirements

### Required Columns:
- `email` - User's email address (will also be used as password)
- `userType` - User type (brand/fan/athlete/coach/team/etc.)

### Sample CSV Format:
```csv
email,userType
john.doe@example.com,athlete
jane.smith@company.com,brand
fan@example.com,fan
```

## User Type Mapping

The system automatically maps userType to appropriate roles:

| UserType in CSV | Role | Description |
|-----------------|------|-------------|
| `brand` | brand | Brand/company user |
| `fan` | fan | Fan user |
| Any other type | sports-ambassador | Sports ambassador (athlete, coach, team, influencer, etc.) |

## User Creation Process

1. **Validation**: Each CSV row is validated for required fields and format
2. **Duplicate Check**: System checks if user already exists by email
3. **Supabase Creation**: User is created in Supabase with:
   - Email as username
   - Email as password
   - Email verification set to false
   - Metadata marking as imported user
4. **MongoDB Creation**: User profile is created in MongoDB with:
   - Role based on userType
   - Profile completion status set to false
   - State set to active
5. **Error Handling**: If MongoDB creation fails, Supabase user is cleaned up

## Error Handling

- **Duplicate Users**: Skipped with warning
- **Invalid Data**: Row skipped with detailed error message
- **Supabase Errors**: User creation continues with next record
- **MongoDB Errors**: Supabase user is cleaned up, error logged
- **Network Errors**: Detailed error reporting

## API Endpoints

### POST `/api/admin/upload-csv`
Handles CSV file upload and user creation.

**Request**: FormData with `csvFile` field
**Response**: 
```json
{
  "success": true,
  "message": "CSV upload completed. X users created, Y failed.",
  "results": {
    "total": 100,
    "successful": 95,
    "failed": 5,
    "errors": [...]
  }
}
```

## Files Created

- `/src/app/api/admin/upload-csv/route.js` - API endpoint for CSV processing
- `/src/lib/csvUtils.js` - Utility functions for CSV parsing and validation
- `/src/components/admin/CSVUpload.jsx` - React component for file upload UI
- `/src/app/admin/csv-upload/page.jsx` - Admin page for CSV upload
- `sample-users.csv` - Sample CSV file for testing

## Environment Variables Required

- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key for admin operations
- MongoDB connection string (via your existing setup)

## Security Considerations

- Only admin users should have access to the CSV upload functionality
- Service role key is used for Supabase admin operations
- All user passwords are set to their email addresses initially
- Users should be required to change passwords on first login
- Email verification is disabled by default - implement verification flow as needed

## Testing

Use the provided `sample-users.csv` file to test the upload functionality. The sample includes different user types to verify role mapping works correctly.

## Troubleshooting

1. **CSV Parse Errors**: Ensure CSV format matches requirements, especially JSON in PublicData
2. **Supabase Errors**: Check service role key and permissions
3. **MongoDB Errors**: Verify database connection and User model schema
4. **Memory Issues**: For large CSV files, consider implementing batch processing

## Future Enhancements

- [ ] Batch processing for very large CSV files
- [ ] Email notifications to imported users
- [ ] Automatic Stripe customer creation (if needed)
- [ ] Custom field mapping configuration
- [ ] Import history and audit logging
