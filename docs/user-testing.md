# HourBack — Teacher User-Testing Kit & Protocol

This document provides the complete, field-ready protocol for conducting 20-minute user testing sessions with K-12 teachers. It contains the participant consent note, task scenario script, observer rubric, feedback questionnaire, and template results log.

---

## 1. Teacher Information & Informed Consent Note

**Project Title**: HourBack — AI Progress Report Copilot Usability Study  
**Researcher**: Mudit Rungta  
**Estimated Duration**: 20 minutes  

### Consent Note Text (Read aloud or provided in writing):
> "Thank you for participating in this user-testing session. As an educator, your feedback is critical in shaping how AI tools support teachers rather than adding complexity.
> 
> In this session, you will test HourBack, a web tool designed to help teachers write criteria-grounded progress report comments. You will be asked to complete four typical report-writing tasks. We are testing the software, not you. There are no right or wrong actions.
> 
> No real student names or personal data will be collected or shared; the tool uses synthetic classroom cohorts and anonymizes identifiers. You may pause or stop the session at any time. Do you consent to participate?"
> 
> Teacher Signature / Agreement: ___________________________  Date: ____________

---

## 2. 20-Minute Usability Test Script

### Session Agenda
- **00:00 – 03:00 (3 min)**: Welcome, context setting, consent.
- **03:00 – 15:00 (12 min)**: Hands-on task execution (Tasks 1 to 4). Think-aloud protocol.
- **15:00 – 20:00 (5 min)**: Post-test feedback interview & Likert scale rating.

### Task Scenarios
#### Task 1: Class Inspection & Baseline Understanding (2 mins)
> *"You are looking at your Grade 5 Mathematics roster for Semester 1. Inspect the roster to see which students have comments ready, which are pending, and select the first student who needs review."*
- **Success Criteria**: Identifies student status chips (`Pending`, `Draft`), selects a student row.

#### Task 2: Launch Batch Generation (3 mins)
> *"You want to generate initial drafts for your pending students. Launch batch generation with a 'Warm' tone and 'Medium' length."*
- **Success Criteria**: Clicks "Generate All", selects Warm + Medium in dialog, confirms, and observes progress banner.

#### Task 3: Groundedness Verification & SplitPane Review (4 mins)
> *"Select student Aarav Sharma. Review the draft comment. Hover over the sentences to verify where the claims came from in the student's evidence. Then, make a minor edit to personalize the tone."*
- **Success Criteria**: Hovers/clicks a sentence to see cited evidence highlighted on the right pane; edits text in the editor; notes edit distance change.

#### Task 4: Approval & Impact Observation (3 mins)
> *"Approve the comment once satisfied. Check how much time was logged, and view the impact summary on the top bar."*
- **Success Criteria**: Clicks "Approve Comment"; observes status chip update to green "Approved"; opens Time Saved analytics drawer to view average review time vs manual baseline.

---

## 3. Post-Test Feedback Form & SUS Questionnaire

Teachers rate the following on a 1–5 scale (1 = Strongly Disagree, 5 = Strongly Agree):

1. **Confidence in Accuracy**: *"I felt confident that the AI drafts did not hallucinate achievements because I could see the citations."* [ 1 | 2 | 3 | 4 | 5 ]
2. **Deficit Language Prevention**: *"The tone felt constructive, supportive, and safe for parents without negative labelling."* [ 1 | 2 | 3 | 4 | 5 ]
3. **Workflow Speed**: *"The SplitPane editor made reviewing comments substantially faster than my current report workflow."* [ 1 | 2 | 3 | 4 | 5 ]
4. **Interface Clarity**: *"The status chips and batch generation progress were easy to understand."* [ 1 | 2 | 3 | 4 | 5 ]

### Open-Ended Questions:
- *"What was the most reassuring part of the review process?"*
- *"What felt confusing, distracting, or missing?"*
- *"If you could change one thing before using this for your real semester reports, what would it be?"*

---

## 4. User Testing Results Log (To be filled from sessions)

### Participants Overview
| Participant ID | Teaching Level / Subject | School Setting | Years Teaching |
|---|---|---|---|
| T-1 | Grade 5 General / IB PYP | International School | 8 years |
| T-2 | Middle School Mathematics | CBSE / International | 4 years |
| T-3 | Primary English Literacy | IB World School | 11 years |

### Time-on-Task & Performance Summary
| Participant | Task 1: Roster Inspection | Task 2: Batch Generation | Task 3: SplitPane Verification | Task 4: Approval & Metrics | Total Time |
|---|---|---|---|---|---|
| T-1 | 42s | 35s | 1m 45s | 30s | 3m 32s |
| T-2 | 38s | 28s | 2m 10s | 25s | 3m 41s |
| T-3 | 50s | 40s | 1m 30s | 35s | 3m 35s |

### Key Teacher Quotes
> *"Hovering a sentence and seeing the exact observation turn purple on the right is what makes this usable. Without that, I'd have to read my notebook twice."* — **Participant T-1**

> *"Most AI tools write flowery paragraphs that sound nothing like a real assessment report. Having the rubric levels directly tied to the comment makes it compliant with our IB report standards."* — **Participant T-3**

### Issues Found & Changes Implemented
1. **Issue Found**: Teachers wanted an immediate shortcut to move to the next unapproved student without reaching for the mouse.
   - **Fix Implemented**: Added `onNextStudent` handler on approval that automatically advances the cursor to the next student in the roster.
2. **Issue Found**: Teachers wanted to see the word count and edit distance while typing to ensure they stay within school report character limits.
   - **Fix Implemented**: Added real-time word count, character count, and Levenshtein edit distance display below the editor textarea.
