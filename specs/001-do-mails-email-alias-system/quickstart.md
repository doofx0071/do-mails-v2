# Quickstart: do-Mails Manual Testing Guide

**Date**: 2025-09-10  
**Phase**: 1 - Design & Contracts  
**Purpose**: Manual validation of core user scenarios

## Prerequisites

### Environment Setup
- [x] Next.js 14 application running on `http://localhost:3000`
- [ ] Supabase project configured with database tables
- [ ] Mailgun account with API keys configured
- [ ] Test domain available for DNS configuration
- [ ] Email client for testing (Gmail, Outlook, etc.)

### Test Data Requirements
- [ ] Test user account created in Supabase Auth
- [ ] Test domain name (e.g., `test-domain-123.com`)
- [ ] External email address for testing (e.g., `tester@gmail.com`)

## Core User Journey Testing

### 1. User Authentication Flow
**Objective**: Verify user can sign up and log in

**Steps**:
1. Navigate to `http://localhost:3000`
2. Click "Sign Up" button
3. Enter email: `test@example.com` and password: `TestPass123!`
4. Check email for verification link and click it
5. Log in with credentials
6. Verify redirect to dashboard

**Expected Results**:
- [ ] User successfully creates account
- [ ] Email verification works
- [ ] User can log in and access dashboard
- [ ] User session persists across page refreshes

### 2. Domain Management Flow
**Objective**: Verify domain addition and verification process

**Steps**:
1. From dashboard, click "Add Domain"
2. Enter test domain name: `test-domain-123.com`
3. Click "Add Domain"
4. Note the verification token displayed
5. Create DNS TXT record: `_domails-verify.test-domain-123.com` = `[token]`
6. Click "Verify Domain" button
7. Wait for verification status to update

**Expected Results**:
- [ ] Domain appears in domain list with "pending" status
- [ ] Verification instructions are clear and accurate
- [ ] DNS verification succeeds and status changes to "verified"
- [ ] Domain verification failure shows helpful error message
- [ ] Cannot create aliases on unverified domains

### 3. Email Alias Creation Flow
**Objective**: Verify alias creation and management

**Steps**:
1. Select verified domain from domain list
2. Click "Create Alias"
3. Enter alias name: `shopping`
4. Click "Create"
5. Verify alias appears as `shopping@test-domain-123.com`
6. Click "Generate Random Alias"
7. Verify random alias is created
8. Toggle alias enabled/disabled status

**Expected Results**:
- [ ] Manual alias creation works with valid names
- [ ] Random alias generation creates unique names
- [ ] Alias list shows all created aliases
- [ ] Enable/disable toggle works correctly
- [ ] Cannot create duplicate aliases on same domain
- [ ] Invalid alias names are rejected with clear error

### 4. Email Reception Flow
**Objective**: Verify inbound email processing

**Steps**:
1. Send test email from external account to `shopping@test-domain-123.com`
2. Subject: "Test Email 1"
3. Body: "This is a test email to verify reception"
4. Check do-Mails inbox for new email
5. Verify email appears in unified inbox
6. Click on email to read full content
7. Verify alias information is displayed

**Expected Results**:
- [ ] Email appears in inbox within 30 seconds
- [ ] Email shows correct alias recipient
- [ ] Email content displays correctly (text and HTML)
- [ ] Email metadata (sender, timestamp) is accurate
- [ ] Attachments are handled properly if included

### 5. Email Threading Flow
**Objective**: Verify conversation grouping

**Steps**:
1. Reply to the test email from external account
2. Subject: "Re: Test Email 1"
3. Check do-Mails inbox
4. Verify emails are grouped in same thread
5. Send another reply from external account
6. Verify all emails appear in same conversation

**Expected Results**:
- [ ] Related emails are grouped into threads
- [ ] Thread shows correct message count
- [ ] Thread displays latest message timestamp
- [ ] Thread participants list is accurate
- [ ] Can expand thread to see all messages

### 6. Email Composition and Reply Flow
**Objective**: Verify outbound email functionality

**Steps**:
1. Click "Compose" button
2. Select alias: `shopping@test-domain-123.com`
3. To: `tester@gmail.com`
4. Subject: "Test Outbound Email"
5. Body: "This is a test email sent from do-Mails"
6. Click "Send"
7. Check external email account for received email
8. Verify sender shows as alias address

**Expected Results**:
- [ ] Email composition interface works
- [ ] Can select sending alias
- [ ] Email sends successfully
- [ ] Recipient receives email from alias address
- [ ] Reply-to address is set to alias
- [ ] Email appears in sent items

### 7. Reply Functionality Flow
**Objective**: Verify reply maintains alias identity

**Steps**:
1. Open received email in do-Mails inbox
2. Click "Reply" button
3. Verify "From" field shows correct alias
4. Add reply content: "This is my reply"
5. Click "Send"
6. Check external email account for reply
7. Verify reply comes from original alias

**Expected Results**:
- [ ] Reply automatically uses correct alias
- [ ] Cannot change "From" address in reply
- [ ] Reply maintains conversation thread
- [ ] External recipient sees reply from alias
- [ ] Reply appears in do-Mails sent items

### 8. Email Organization Flow
**Objective**: Verify labeling and archiving

**Steps**:
1. Select email thread in inbox
2. Add label: "Important"
3. Verify label appears on thread
4. Archive the thread
5. Verify thread disappears from inbox
6. Navigate to "Archived" view
7. Verify thread appears in archived items

**Expected Results**:
- [ ] Can add/remove labels from threads
- [ ] Labels are saved and displayed correctly
- [ ] Archive function works
- [ ] Archived items are accessible
- [ ] Can unarchive threads

### 9. Search Functionality Flow
**Objective**: Verify email search capabilities

**Steps**:
1. Use search box to search for "test"
2. Verify relevant emails appear
3. Search by sender email address
4. Search by specific alias recipient
5. Use date range filters
6. Combine multiple search criteria

**Expected Results**:
- [ ] Text search finds relevant emails
- [ ] Sender search works correctly
- [ ] Alias filtering works
- [ ] Date range filtering works
- [ ] Search results are accurate and fast
- [ ] Can clear search filters

### 10. Email Signature Flow
**Objective**: Verify signature management

**Steps**:
1. Navigate to alias settings
2. Set signature for `shopping@test-domain-123.com`
3. Signature: "Best regards, Shopping Team"
4. Save signature
5. Compose new email from this alias
6. Verify signature appears automatically
7. Send email and check recipient sees signature

**Expected Results**:
- [ ] Can set custom signature per alias
- [ ] Signature appears in composed emails
- [ ] Signature is included in sent emails
- [ ] Can edit/remove signatures
- [ ] HTML signatures render correctly

## Performance Testing

### Load Testing Scenarios
1. **Inbox Loading**: Time to load 100+ email threads
2. **Search Performance**: Search through 1000+ emails
3. **Real-time Updates**: New email notification speed
4. **Attachment Handling**: Upload/download 10MB+ files

**Performance Targets**:
- [ ] Inbox loads in <2 seconds
- [ ] Search results appear in <1 second
- [ ] New emails appear in <30 seconds
- [ ] Attachments upload/download without timeout

## Error Handling Testing

### Network Failure Scenarios
1. **Offline Composition**: Compose email while offline
2. **Failed Send**: Handle Mailgun API failures
3. **Webhook Failures**: Handle missed webhook deliveries
4. **Database Errors**: Handle Supabase connection issues

**Expected Error Handling**:
- [ ] Clear error messages for users
- [ ] Graceful degradation when services unavailable
- [ ] Retry mechanisms for failed operations
- [ ] Data consistency maintained during failures

## Security Testing

### Data Isolation Testing
1. **Multi-User Test**: Create second user account
2. **Cross-User Access**: Verify users cannot see each other's data
3. **URL Manipulation**: Try accessing other user's email IDs
4. **API Security**: Test API endpoints with different user tokens

**Security Validation**:
- [ ] Users cannot access other users' domains
- [ ] Users cannot access other users' emails
- [ ] API returns 403 for unauthorized access
- [ ] RLS policies prevent data leakage

## Completion Checklist

**Core Functionality**:
- [ ] User authentication works end-to-end
- [ ] Domain verification process completes successfully
- [ ] Email aliases can be created and managed
- [ ] Inbound emails are received and displayed
- [ ] Email threading groups conversations correctly
- [ ] Outbound emails send from correct alias
- [ ] Reply functionality maintains alias identity
- [ ] Email organization (labels, archive) works
- [ ] Search functionality finds relevant emails
- [ ] Email signatures are applied correctly

**Performance & Reliability**:
- [ ] All operations complete within performance targets
- [ ] Error handling provides clear user feedback
- [ ] Security measures prevent unauthorized access
- [ ] Data isolation between users is maintained

**Ready for Production**: All checklist items must pass before deployment

---

**Note**: This quickstart guide should be executed after each major code change to ensure functionality remains intact. Automate these tests where possible using Playwright E2E testing framework.
