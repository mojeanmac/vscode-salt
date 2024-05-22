export const quiz = ``;

export const allOrPublic = `
<html>
    <style>
        body {
            font-size: 18px;
        }
        p {
            margin-top: 30px;
            width: 80%;
        }
        form {
            width: 250px;
            margin: 0 auto; 
        }
    </style>
    <body>
        <p>Would you like SALT to collect telemetry from <b>all workspaces</b> or only workspaces cloned from <b>public</b> Github repositories? (This can be changed later in settings)</p>
        <form>
            <input type="radio" id="all" name="agreement" value="all" checked>
            <label for="all">All workspaces</label>
            <br />
            <input type="radio" id="public" name="agreement" value="public">
            <label for="public">Only public repositories</label>
            <br />
        </form>
        <br />
        <form>
            <button type="button" id="submit">Submit</button>
        </form>
        <script>

            document.getElementById('submit').addEventListener("click", () => {
                let all = document.getElementById("all").checked;
                let public = document.getElementById("public").checked;

                if (!all && !public) {
                    return;
                }
                
                const vscode = acquireVsCodeApi();
                if (all) {
                    vscode.postMessage({
                        command: 'submit',
                        text: "all"
                    });
                }
                if (public) {
                    vscode.postMessage({
                        command: 'submit',
                        text: "public"
                    });
                }
            });
        </script>
    </body>
</html>
`;

export const consentForm = `<style>
.parabreak {
    line-height: 16px;
}
</style>

<!DOCTYPE html>
<html>
<h3>You've been invited by SALT to...</h3>
<h1>Participate in Academic Research!</h1>
<p class="parabreak">
<i><b>Note:</b></i> In this consent the word “you” refers to the person being considered for enrollment in the study
described.
<br /><br />
<b>1. Study Title and Number</b>
<br /><br />
Title: <b>A Real-World Study of Rust Learning</b>
<br />
Study # 808900
<br /><br />
<b>2. Principal Investigator</b>
<br /><br />
Michael Coblenz, Assistant Professor, UCSD
<br />
mcoblenz@ucsd.edu
<br /><br />
<b>3. Study Overview</b>
<br /><br />
This research study is being conducted to understand how error Rust programmers understand and fix errors in their
code, and to evaluate prototype tools that may help understand errors.
<br /><br />
We are inviting you to participate in a research study because you downloaded our Visual Studio Code extension.
<br /><br />
This form explains the research so that you may make an informed decision about participating.
<br />
<ul>
<li>Research is voluntary - whether or not you participate is your decision. You can discuss your decision with
    others.</li>
<li>You can say yes, but change your mind later.</li>
<li>If you say no, we will not hold your decision against you.</li>
<li>Please ask the study team questions about anything that is not clear, and feel free to ask questions and mention
    concerns before, during, and after the research.</li>
<li>You may consult with friends, family, or anyone else before deciding whether or not to be in the study. </li>
<li>You will be given a copy of this consent form and the Participant’s Bill of Rights. </li>
</ul>
The purpose of this research study is to learn how programmers learn and use Rust so that we can design and evaluate
approaches to making Rust programmers more successful. We also would like to find out whether the tools we are
developing help participants learn Rust more effectively.
<br /><br />
You will be asked to enable telemetry for this extension so that we can receive the logs of error frequency and duration
of errors in your Rust programs. These logs collect error codes and time intervals between program builds to track how
long it takes to resolve certain errors. You may also be randomly selected to opt-in to new features.
<br /><br />
The most common risks or discomforts of this study are finding the learning tools confusing or incorrect. You are free
to disable the tools at any time.
<br /><br />
The most serious discomfort may be with not wanting to have a record of data about errors you have made while
programming in Rust. While a copy of the log will be saved on your client, the data sent to our servers will not be
associated with any identifiable information about you.
<br /><br />
A complete listing of possible risks and discomforts associated with this study can be found in Section 9 of this
document.
<br /><br />
We cannot promise any benefit to you or to others from you participating in this research. However, possible benefits
include an easier time fixing Rust compiler errors using the features provided. Additionally, we hope to learn how to
make Rust easier to use for many different Rust programmers.
<br /><br />
The alternative to being in this study is not to participate.
<br /><br />
<i><b>More detailed information about this research study is provided below.</b></i>
<br /><br />
<b>4. Whom can I talk to if I have questions?</b>
<br /><br />
If during your participation in the study you have questions or concerns, or if you think the research has hurt you,
contact the research team at the numbers listed in Section 3 on the first page of this form. You should not agree to
participate in this study until the research team has answered any questions you have about the study, including
information contained in this form.
<br /><br />
If before or during your participation in the study you have questions about your rights as a research participant, or
you want to talk to someone outside the research team, please contact:
<br />
<ul>
<li>UC San Diego Office of IRB Administration at 858-246-4777 or irb@ucsd.edu</li>
</ul>
<b>7. How many people will take part?</b>
<br /><br />
We plan to study up to 10,000 people. The research is online and will include people across all locations.
<br /><br />
<b>8. What happens if I take part in the research?</b>
<br /><br />
As you read this form, ask questions if something is not clear.
<br /><br />
You will be asked to fill out a demographics survey and enable telemetry in the extension settings.
<br /><br />
For every new feature, you will be “randomized” into one of 2 study groups: a group who may enable the feature, and a
control group without the feature.
<br /><br />
Randomization means that you are put into a group by chance. It is like flipping a coin. Neither you nor the researchers
choose which group you will be in. You will have a 50% chance of being placed in a specific group.
<br /><br />
Each experiment will last no longer than one month. After that, if you were placed in a control group, the feature will
be enabled for you. Some individual studies may be shorter. We will collect telemetry for up to one year, but you can
disable telemetry at any time.
<br /><br />
<b>9. What are the risks and possible discomforts?</b>
<br /><br />
It is possible that features and tools made available in this study may seem confusing or incorrect, in which case you
may choose to disable them. We will also be sending logs that include how frequently you build Rust programs and which
types of errors you make to a cloud server. If you no longer feel comfortable participating, you may disable telemetry
and log collection in the extension settings.
<br /><br />
<i><b>Risks of Loss of Confidential Information:</b></i> In the unlikely event that the data were disclosed, employers
could attempt to match the data with individuals and use this data to infer productivity information about participants.
We mitigate this risk by not associating any identifying information about participants with participant data.
<br /><br />
<b>10. How will information about me be protected?</b>
<br /><br />
While we cannot guarantee complete confidentiality, we will limit access to information about you. Only people who have
a need to review your information will have access. These people might include members of the research team and other
staff or representatives of UCSD whose work is related to the research or to protecting your rights and safety.
<br /><br />
By agreeing to participate, data about your error messages including error codes, line numbers, and intervals between
successive program builds will be logged and sent to a cloud server for analysis. We will not be collecting raw error
messages, since those could include variable or function names. We may also collect information about usage of IDE
features related to Rust. For example, if we provide a feature that helps fix Rust errors, we may log how often that
feature is used and low-level information about the code to which it is applied (without any identifiers, such as
variable or function names).
<br /><br />
The results of this study may be published once the study is completed. However, we will keep your name and other
identifying information confidential. We expect this study will be completed in 2 years. This is only an estimate and
the actual time to complete the study may be longer or shorter depending on a number of factors.
<br /><br />
<b>11. Will I need to pay to participate in the research?</b>
<br /><br />
There will be no cost to you for participating in this study.
<br /><br />
<b>12. What if I agree to participate, but change my mind later?</b>
<br /><br />
You can stop participating at any time for any reason, and it will not be held against you.
<br /><br />
<b>13. What will happen to information collected from me?</b>
<br /><br />
The data we collect with your identifiable information as a part of this study may be used to answer other research
questions or may be shared with other investigators for other research. If we do so, we will remove all identifiable
information before use or sharing. Once identifiers have been removed, we will not ask for your consent for the use or
sharing of your data in other research. In addition, data that have been de-identified may be shared for other
researchers to access and use.
<br /><br />
While your privacy and confidentiality are very important to us and we will use safety measures to protect it, we cannot
guarantee that your identity will never become known.
<br /><br />
<b>15. Will I be compensated for participating in the research?</b>
<br /><br />
If you agree to take part in this research, we will provide data and personalized analysis about your learning progress
in Rust for your time and effort, if you agree to receive it in section 18. This may include a chart of your most costly
errors and how your progress compares to other users of the extension.
<br /><br />
We will not pay you to take part in this study or pay for any out of pocket expenses related to your participation, such
as travel costs.
<br /><br />
<b>16. What else is important for me to know?</b>
<br /><br />
If you sign up below, you will be provided a summary of the research findings when they
are available.
<br /><br />
<b>17. What are my rights when providing electronic consent?</b>
<br /><br />
California law provides specific rights when you are asked to provide electronic consent:
<br />
<ul>
<li>You have the right to obtain a copy of the consent document in a non-electronic format.</li>
<li>You have the right to provide consent in a non-electronic format.</li>
<li>If you change your mind about electronic consent, you have the right to request your electronic consent to be
    withdrawn and you can then provide consent in a non-electronic format; however, a copy of your electronic
    consent will be maintained for regulatory purposes. If you wish to withdraw your electronic consent please tell
    the study team.</li>
<li>This agreement for electronic consent applies only to your consent to participate in this research study.</li>
</ul>
<!-- <b>18.	Additional Choices to Consider</b>
        <br/><br/>
        We would like to offer the opportunity to receive general results of the research and relevant individual results. You may also change your mind about this choice.  Please select your choice below:
        <br/><br/>
        <input type="radio" id="yessum" name="summaryagreement" value="Yes">
        <label for="yessum">YES, send me a summary of the research results and my individual results.</label>
        <br/>
        <input type="radio" id="nosum" name="summaryagreement" value="No">
        <label for="nosum">NO, do NOT send a summary of the research results or my individual results.</label>
        <br/><br/>
        The study team would like your permission to contact you about participating in future studies.   You may still join this study even if you do not permit future contact. You may also change your mind about this choice.  Please initial your choice below:
        <br/><br/>
        <input type="radio" id="yescontact" name="contactagreement" value="Yes">
        <label for="yescontact">YES, you may contact me</label>
        <br/>
        <input type="radio" id="nocontact" name="contactagreement" value="No">
        <label for="nocontact">NO, you may NOT contact me</label>
        <br/><br/> -->

<h3>Experimental Participant's Bill of Rights</h3>
<b>Every individual asked to participate in a research study has the right to be:</b>
<ol>
<li>Informed about the nature and purpose of the study. </li>
<li>Provided an explanation of the procedures to be followed in the research study, and whether any of the drugs,
    devices, or procedures is different from what would be used in standard practice. </li>
<li>Given a description of any side effects, discomforts, or risks that you can reasonably expect to occur during
    the study.</li>
<li>Informed about any benefits that would reasonably be expected from the participation in the study, if
    applicable.</li>
<li>Informed of any alternative procedures, drugs, or devices that might be helpful, and their risks and benefits
    compared to the proposed procedures, drugs or devices.</li>
<li>Told of the types of medical treatment, if any, available if complications should arise.</li>
<li>Provided an opportunity to ask any questions concerning the research study both before agreeing to participate
    and at any time during the course of the study. </li>
<li>Informed that individuals can refuse to participate in the research study. Participation is voluntary. Research
    participants may refuse to answer any question or discontinue their involvement at any time without penalty or
    loss of benefits to which they might otherwise be entitled. Their decision will not affect their right to
    receive the care they would receive if they were not in the experiment.</li>
<li>Provided a copy of the signed and dated written consent form and a copy of this form. </li>
<li>Given the opportunity to freely decide whether or not to consent to the research study without any force,
    coercion, or undue influence. </li>
</ol>
-------------------------------------------------------
<br /><br />
If you have any concerns or questions regarding the research study contact the researchers listed at the top of the
consent form.
<br /><br />
If you are unable to reach a member of the research team and have general questions, or you have concerns or complaints
about the research study, research team, or questions about your rights as a research participant, please contact:
<ul>
<li>UC San Diego Office of IRB Administration at irb@ucsd.edu or 858-246-4777</li>
</ul>

</p>

<br />
<h2>Participation Agreement</h2>
<p>By participating in this research you are indicating that you are at least 18 years old, have read this consent form,
and agree to participate in this research study. Please keep this consent form for your records.</p>
<form>
<input type="radio" id="agree" name="agreement" value="yes">
<label for="agree">Yes, I agree to participate in this study.</label>
<br />
<input type="radio" id="disagree" name="agreement" value="no">
<label for="disagree">No, I would not like to participate.</label>
<br />
</form>
<br />

<!-- Email of Participant (Optional)
    <br/>
    <textarea id="participantname" name="participantname" rows="1" cols="40"></textarea>
    <br/><br/>
    -->

<form>
<button type="button" id="submit">Submit</button>
</form>

<script>
document.getElementById('submit').addEventListener("click", () => {

    // //checking section 18 radio buttons
    // if(document.querySelector('input[name="summaryagreement"]:checked')==null){
    //     window.alert("Please fill in the email summary consent in Section 18.");
    // }
    // //checking section 18 radio buttons
    // else if(document.querySelector('input[name="contactagreement"]:checked')==null){
    //     window.alert("Please fill in contact permissions in Section 18.");
    // }
    // //checking if they agreed to participate or not
    // else if(document.querySelector('input[name="agreement"]:checked')==null) {
    //     window.alert("Please select an option for Participation Agreement.");
    // }
    // //checking the over 18 radio button
    // else if(document.querySelector('input[name="ageconf"]:checked')==null) {
    //     window.alert("Please confirm you are over 18.");
    // }
    // //checking they signed their name
    // else if(document.getElementById("participantname").value=="") {
    //     window.alert("Please sign your name.");
    // }
    // else if (document.getElementById("agree").value === "yes"){
    //     //record content
    //     //move on to survey
    // }
    // else{
    //     //close webview
    // }
    let agree = document.getElementById("agree").checked;
    let disagree = document.getElementById("disagree").checked;

    if (!agree && !disagree) {
        return;
    }

    const vscode = acquireVsCodeApi();
    if (agree) {
        vscode.postMessage({
            command: 'submitConsentForm',
            text: "yes"
        });
    }
    if (disagree) {
        vscode.postMessage({
            command: 'submitConsentForm',
            text: "no"
        });
    }
});
</script>

</html>`;

export const survey = `<html>

<head>

    <style>
        h1 {
            text-align: center;
        }

        h2 {
            text-align: center;
        }

        p {
            text-align: left;
            font-size: 16;
        }

        /* .questions {
    text-align: left;
    font-size: 16;
}

.container{
    margin-left: 100px;
    margin-right: 100px;
} */

        body {
            display: flex;
            justify-content: center;
            align-items: left;
        }

        #warn {
            color: red;
            text-align: center;
        }
    </style>

    <!-- <script type="text/javascript">
    
    function checkvalueGender(val) {
        var element=document.getElementById('gender');
        if(val=="4")
            element.style.display='inline';
        else
            element.style.display='none';
    }
    
    function checkvalue(val, elementName, elementBoxName) {
        var element=document.getElementById(elementName);
        var elementbox=document.getElementById(elementBoxName);
        if(element.checked)
            elementbox.style.display='inline';
        else {
            elementbox.style.display='none';
        }
    } 
    
</script> -->

</head>

<body>

    <div id="container">
        <h1>Survey</h1>
        <h2>Experience Questions</h2>
        <p id="warn"></p>
        <div class="questions">
            <p>How many years of programming experience do you have?</p>
            <input type="number" id="yearsOfExp" name="yearsOfExp" min="0" max="100" value="0">
        </div>

        <div class="questions">
            <p>How long have you been programming <b>in Rust</b>?</p>
            <select name="rustExp" id="rustExp">
                <option value=-1>Select</option>
                <option value=0>&lt; 1 month</option>
                <option value=1>1 year</option>
                <option value=2>2 years</option>
                <option value=3>3 years</option>
                <option value=4>5+ years</option>
            </select>
        </div>

        <div class="questions">
            <p>Roughly, how many lines of code have you written in Rust?</p>
            <select name="linesOfCode" id="linesOfCode">
                <option value=-1>Select</option>
                <option value=0>Less than 100</option>
                <option value=1>101 - 1000</option>
                <option value=2>1001 - 10000</option>
                <option value=3>10001 - 100000</option>
                <option value=4>More than 100000 lines</option>
            </select>
        </div>

        <div class="questions">
            <p>What is your experience level in the following languages?</p>
            <h4>Java</h4>
            <input type="radio" name="java" value="none" id="java-none">
            <label for="java-none">None</label>
            <br />
            <input type="radio" name="java" value="novice" id="java-novice">
            <label for="java-novice">Novice</label>
            <br />
            <input type="radio" name="java" value="intermediate" id="java-inter">
            <label for="java-inter">Intermediate</label>
            <br />
            <input type="radio" name="java" value="expert" id="java-expert">
            <label for="java-expert">Expert</label>
            <br /><br />
            <h4>JavaScript</h4>
            <input type="radio" name="javascript" value="none" id="js-none">
            <label for="js-none">None</label>
            <br />
            <input type="radio" name="javascript" value="novice" id="js-novice">
            <label for="js-novice">Novice</label>
            <br />
            <input type="radio" name="javascript" value="intermediate" id="js-inter">
            <label for="js-inter">Intermediate</label>
            <br />
            <input type="radio" name="javascript" value="expert" id="js-expert">
            <label for="js-expert">Expert</label>
            <br /><br />
            <h4>C</h4>
            <input type="radio" name="clang" value="none" id="c-none">
            <label for="c-none">None</label>
            <br />
            <input type="radio" name="clang" value="novice" id="c-novice">
            <label for="c-novice">Novice</label>
            <br />
            <input type="radio" name="clang" value="intermediate" id="c-inter">
            <label for="c-inter">Intermediate</label>
            <br />
            <input type="radio" name="clang" value="expert" id="c-expert">
            <label for="c-expert">Expert</label>
            <br /><br />
            <h4>Python</h4>
            <input type="radio" name="python" value="none" id="python-none">
            <label for="python-none">None</label>
            <br />
            <input type="radio" name="python" value="novice" id="python-novice">
            <label for="python-novice">Novice</label>
            <br />
            <input type="radio" name="python" value="intermediate" id="python-inter">
            <label for="python-inter">Intermediate</label>
            <br />
            <input type="radio" name="python" value="expert" id="python-expert">
            <label for="python-expert">Expert</label>
            <br />
        </div>

        <div class="questions">
            <p>What resources have you used to learn Rust? &lpar;select all that apply&rpar;</p>

            <input type="checkbox" name="resources1" value="RustTextbook" id="resources1">
            <label for="resources1">The Rust Programming Language textbook</label>
            <br />
            <input type="checkbox" name="resources2" value="Youtube" id="resources2">
            <label for="resources2">Youtube</label>
            <br />
            <input type="checkbox" name="resources3" value="StackOverflow" id="resources3">
            <label for="resources3">Stack Overflow</label>
            <br />
            <input type="checkbox" name="resources4" value="Other" id="resources4">
            <label for="resources4">Other</label>
            <br />
        </div>

        <br /><br />
        <h2>Demographic Questions</h2>

        <div class="questions">
            <p>What industry do you work in?</p>
            <select name="industry" id="industry">
                <option value="">Select</option>
                <option value="None">None</option>
                <option value="Academia">Academia</option>
                <option value="Industry">Industry</option>
                <option value="Other">Other</option>
            </select>
        </div>

        <div class="questions">
            <p>Please specify the gender with which you most closely identify:</p>
            <select name="gender" id="gender">
                <option value=-1>Select</option>
                <option value=0>Woman</option>
                <option value=1>Man</option>
                <option value=2>Non-binary</option>
                <option value=3>Prefer not to answer</option>
            </select>
            <br />
        </div>

        <div class="questions">
            <p>What is your age?</p>
            <select name="age" id="age">
                <option value=-1>Select</option>
                <option value=0>18-22</option>
                <option value=1>23-30</option>
                <option value=2>31-40</option>
                <option value=3>41-50</option>
                <option value=4>51-60</option>
                <option value=5>Over 60</option>
                <option value=6>Prefer not to answer</option>
            </select>
        </div>

        <div class="questions">
            <p>What is the highest degree or level of school you have completed?</p>
            <select name="degree" id="degree">
                <option value=-1>Select</option>
                <option value=0>Some high school credit, no diploma or equivalent</option>
                <option value=1>Less than high school degree</option>
                <option value=2>High school graduate (high school diploma or equivalent including GED) </option>
                <option value=3>Some college but no degree</option>
                <option value=4>Associate's degree</option>
                <option value=5>Bachelor's degree</option>
                <option value=6>Advanced degree (e.g., Master's, doctorate)</option>
                <option value=7>Prefer not to answer</option>
            </select>
        </div>

        <br />
        <p>Please answer all questions before submitting.</p>
        <div style="text-align: center;">
            <button type=button id="submit">Submit</button>
        </div>
    </div>

    <script>
        document.getElementById('submit').addEventListener("click", () => {

            let yearsOfExp = document.getElementById("yearsOfExp").value;
            let rustExp = document.getElementById("rustExp").value;
            if (rustExp == -1) {
                document.getElementById("warn").innerHTML = "One or more questions are unanswered.";
                document.getElementById("rustExp").focus();
                return;
            }
            let linesOfCode = document.getElementById("linesOfCode").value;
            if (linesOfCode == -1) {
                document.getElementById("warn").innerHTML = "One or more questions are unanswered.";
                document.getElementById("linesOfCode").focus();
                return;
            }

            let java = document.querySelectorAll('input[name="java"]');
            let javaExp = '';
            for (const rb of java) {
                if (rb.checked) {
                    javaExp = rb.value;
                    break;
                }
            }
            if (javaExp == '') {
                document.getElementById("warn").innerHTML = "One or more questions are unanswered.";
                document.getElementById("java").focus();
                return;
            }

            let javascript = document.querySelectorAll('input[name="javascript"]');
            let jsExp = '';
            for (const rb of javascript) {
                if (rb.checked) {
                    jsExp = rb.value;
                    break;
                }
            }
            if (jsExp == '') {
                document.getElementById("warn").innerHTML = "One or more questions are unanswered.";
                document.getElementById("js").focus();
                return;
            }

            let clang = document.querySelectorAll('input[name="clang"]');
            let cExp = '';
            for (const rb of clang) {
                if (rb.checked) {
                    cExp = rb.value;
                    break;
                }
            }
            if (cExp == '') {
                document.getElementById("warn").innerHTML = "One or more questions are unanswered.";
                document.getElementById("c").focus();
                return;
            }

            let python = document.querySelectorAll('input[name="python"]');
            let pythonExp = '';
            for (const rb of python) {
                if (rb.checked) {
                    pythonExp = rb.value;
                    break;
                }
            }
            if (pythonExp == '') {
                document.getElementById("warn").innerHTML = "One or more questions are unanswered.";
                document.getElementById("python").focus();
                return;
            }

            let rustBook = document.getElementById("resources1").checked;
            let youtube = document.getElementById("resources2").checked;
            let stackOverflow = document.getElementById("resources3").checked;
            let other = document.getElementById("resources4").checked;

            let industry = document.getElementById("industry").value;
            if (industry == "") {
                document.getElementById("warn").innerHTML = "One or more questions are unanswered.";
                document.getElementById("industry").focus();
                return;
            }
            let gender = document.getElementById("gender").value;
            if (gender == -1) {
                document.getElementById("warn").innerHTML = "One or more questions are unanswered.";
                document.getElementById("gender").focus();
                return;
            }
            let age = document.getElementById("age").value;
            if (age == -1) {
                document.getElementById("warn").innerHTML = "One or more questions are unanswered.";
                document.getElementById("age").focus();
                return;
            }
            let degree = document.getElementById("degree").value;
            if (degree == -1) {
                document.getElementById("warn").innerHTML = "One or more questions are unanswered.";
                document.getElementById("degree").focus();
                return;
            }

            // //checking rustExp - how long they've been programming in Rust
            // if(document.getElementById("rustExp").value==-1){
            //     window.alert("Please tell us how long you've been programming in Rust.");
            // }
            // //checking java, javascript, clang, and python - what programming languages they have experience in
            // else if(document.querySelector('input[name="java"]:checked')==null
            // || document.querySelector('input[name="javascript"]:checked')==null
            // || document.querySelector('input[name="clang"]:checked')==null
            // || document.querySelector('input[name="python"]:checked')==null){
            //     window.alert("Please tell us what programming languages you have experience in.");
            // }
            // //checking resources - what resources they used to learn Rust
            // else if(!(document.getElementById("resources1").checked
            // ||document.getElementById("resources2").checked
            // ||document.getElementById("resources3").checked
            // ||document.getElementById("resources4").checked)) {
            //     window.alert("Please tell us how you learned Rust.");
            // }
            // //checking linesOfCode - how many lines of code they have written
            // else if(document.getElementById("linesOfCode").value==-1){
            //     window.alert("Please tell us how many lines of code you've written in Rust.");
            // }
            // //checking industry
            // else if(document.getElementById("industry").value=="Select"){
            //     window.alert("Please select your industry.");
            // }
            // //checking gender
            // else if(document.getElementById("gender").value==-1){
            //     window.alert("Please select your gender.");
            // }
            // //checking age
            // else if(document.getElementById("age").value==-1){
            //     window.alert("Please select your age.");
            // }
            // //checking degree
            // else if(document.getElementById("degree").value==-1){
            //     window.alert("Please select your level of education.");
            // }
            // else{
            //     //close webview, move onto thank you page
            //     window.location.replace("thankyoumessage.html");
            // }


            let results = {
                "experience": {
                    "codingExp": yearsOfExp,
                    "rustExp": rustExp,
                    "linesOfCode": linesOfCode,
                },
                "languages": {
                    "java": javaExp,
                    "javascript": jsExp,
                    "c": cExp,
                    "python": pythonExp,
                },
                "resources": {
                    "rustBook": rustBook,
                    "youtube": youtube,
                    "stackOverflow": stackOverflow,
                    "other": other,
                },

                "demographics": {
                    "industry": industry,
                    "gender": gender,
                    "age": age,
                    "degree": degree
                }
            }
            console.log(results);

            //Send a message to the extension with the form data
            const vscode = acquireVsCodeApi();
            vscode.postMessage({
                command: 'submitSurvey',
                text: results
            });
        });
    </script>

</html>`;

export const consentFormPersonal = `
<style>
    .parabreak {
        line-height: 16px;
    }
</style>

<!DOCTYPE html>
<html>
<h3>You've been invited by SALT to...</h3>
<h1>Participate in Academic Research!</h1>
<p class="parabreak">
    <i><b>Note:</b></i> In this consent the word “you” refers to the person being considered for enrollment in the study
    described.
    <br /><br />
    <b>1. Study Title and Number</b>
    <br /><br />
    Title: <b>A Real-World Study of Rust Learning</b>
    <br />
    Study # 808900
    <br /><br />
    <b>2. Principal Investigator</b>
    <br /><br />
    Michael Coblenz, Assistant Professor, UCSD
    <br />
    mcoblenz@ucsd.edu
    <br /><br />
    <b>3. Study Overview</b>
    <br /><br />
    This research study is being conducted to understand how error Rust programmers understand and fix errors in their
    code, and to evaluate prototype tools that may help understand errors.
    <br /><br />
    We are inviting you to participate in a research study because you downloaded our Visual Studio Code extension.
    <br /><br />
    This form explains the research so that you may make an informed decision about participating.
    <br />
<ul>
    <li>Research is voluntary - whether or not you participate is your decision. You can discuss your decision with
        others.</li>
    <li>You can say yes, but change your mind later.</li>
    <li>If you say no, we will not hold your decision against you.</li>
    <li>Please ask the study team questions about anything that is not clear, and feel free to ask questions and mention
        concerns before, during, and after the research.</li>
    <li>You may consult with friends, family, or anyone else before deciding whether or not to be in the study. </li>
    <li>You will be given a copy of this consent form and the Participant’s Bill of Rights. </li>
</ul>
The purpose of this research study is to learn how programmers learn and use Rust so that we can design and evaluate
approaches to making Rust programmers more successful. We also would like to find out whether the tools we are
developing help participants learn Rust more effectively.
<br /><br />
You will be asked to enable telemetry for this extension so that we can receive the logs of error frequency and duration
of errors in your Rust programs. These logs collect error codes and time intervals between program builds to track how
long it takes to resolve certain errors. You may also be randomly selected to opt-in to new features.
<br /><br />
The most common risks or discomforts of this study are finding the learning tools confusing or incorrect. You are free
to disable the tools at any time.
<br /><br />
The most serious discomfort may be with not wanting to have a record of data about errors you have made while
programming in Rust. While a copy of the log will be saved on your client, the data sent to our servers will not be
associated with any identifiable information about you.
<br /><br />
A complete listing of possible risks and discomforts associated with this study can be found in Section 9 of this
document.
<br /><br />
We cannot promise any benefit to you or to others from you participating in this research. However, possible benefits
include an easier time fixing Rust compiler errors using the features provided. Additionally, we hope to learn how to
make Rust easier to use for many different Rust programmers.
<br /><br />
The alternative to being in this study is not to participate.
<br /><br />
<i><b>More detailed information about this research study is provided below.</b></i>
<br /><br />
<b>4. Whom can I talk to if I have questions?</b>
<br /><br />
If during your participation in the study you have questions or concerns, or if you think the research has hurt you,
contact the research team at the numbers listed in Section 3 on the first page of this form. You should not agree to
participate in this study until the research team has answered any questions you have about the study, including
information contained in this form.
<br /><br />
If before or during your participation in the study you have questions about your rights as a research participant, or
you want to talk to someone outside the research team, please contact:
<br />
<ul>
    <li>UC San Diego Office of IRB Administration at 858-246-4777 or irb@ucsd.edu</li>
</ul>
<b>7. How many people will take part?</b>
<br /><br />
We plan to study up to 10,000 people. The research is online and will include people across all locations.
<br /><br />
<b>8. What happens if I take part in the research?</b>
<br /><br />
As you read this form, ask questions if something is not clear.
<br /><br />
You will be asked to fill out a demographics survey and enable telemetry in the extension settings.
<br /><br />
For every new feature, you will be “randomized” into one of 2 study groups: a group who may enable the feature, and a
control group without the feature.
<br /><br />
Randomization means that you are put into a group by chance. It is like flipping a coin. Neither you nor the researchers
choose which group you will be in. You will have a 50% chance of being placed in a specific group.
<br /><br />
Each experiment will last no longer than one month. After that, if you were placed in a control group, the feature will
be enabled for you. Some individual studies may be shorter. We will collect telemetry for up to one year, but you can
disable telemetry at any time.
<br /><br />
<b>9. What are the risks and possible discomforts?</b>
<br /><br />
It is possible that features and tools made available in this study may seem confusing or incorrect, in which case you
may choose to disable them. We will also be sending logs that include how frequently you build Rust programs and which
types of errors you make to a cloud server. If you no longer feel comfortable participating, you may disable telemetry
and log collection in the extension settings.
<br /><br />
<i><b>Risks of Loss of Confidential Information:</b></i> In the unlikely event that the data were disclosed, employers
could attempt to match the data with individuals and use this data to infer productivity information about participants.
We mitigate this risk by not associating any identifying information about participants with participant data.
<br /><br />
<b>10. How will information about me be protected?</b>
<br /><br />
While we cannot guarantee complete confidentiality, we will limit access to information about you. Only people who have
a need to review your information will have access. These people might include members of the research team and other
staff or representatives of UCSD whose work is related to the research or to protecting your rights and safety.
<br /><br />
By agreeing to participate, data about your error messages including error codes, line numbers, and intervals between
successive program builds will be logged and sent to a cloud server for analysis. We will not be collecting raw error
messages, since those could include variable or function names. We may also collect information about usage of IDE
features related to Rust. For example, if we provide a feature that helps fix Rust errors, we may log how often that
feature is used and low-level information about the code to which it is applied (without any identifiers, such as
variable or function names).
<br /><br />
The results of this study may be published once the study is completed. However, we will keep your name and other
identifying information confidential. We expect this study will be completed in 2 years. This is only an estimate and
the actual time to complete the study may be longer or shorter depending on a number of factors.
<br /><br />
<b>11. Will I need to pay to participate in the research?</b>
<br /><br />
There will be no cost to you for participating in this study.
<br /><br />
<b>12. What if I agree to participate, but change my mind later?</b>
<br /><br />
You can stop participating at any time for any reason, and it will not be held against you.
<br /><br />
<b>13. What will happen to information collected from me?</b>
<br /><br />
The data we collect with your identifiable information as a part of this study may be used to answer other research
questions or may be shared with other investigators for other research. If we do so, we will remove all identifiable
information before use or sharing. Once identifiers have been removed, we will not ask for your consent for the use or
sharing of your data in other research. In addition, data that have been de-identified may be shared for other
researchers to access and use.
<br /><br />
While your privacy and confidentiality are very important to us and we will use safety measures to protect it, we cannot
guarantee that your identity will never become known.
<br /><br />
<b>15. Will I be compensated for participating in the research?</b>
<br /><br />
If you agree to take part in this research, we will provide data and personalized analysis about your learning progress
in Rust for your time and effort, if you agree to receive it in section 18. This may include a chart of your most costly
errors and how your progress compares to other users of the extension.
<br /><br />
We will not pay you to take part in this study or pay for any out of pocket expenses related to your participation, such
as travel costs.
<br /><br />
<b>16. What else is important for me to know?</b>
<br /><br />
If you sign up below, you will be provided a summary of the research findings when they
are available.
<br /><br />
<b>17. What are my rights when providing electronic consent?</b>
<br /><br />
California law provides specific rights when you are asked to provide electronic consent:
<br />
<ul>
    <li>You have the right to obtain a copy of the consent document in a non-electronic format.</li>
    <li>You have the right to provide consent in a non-electronic format.</li>
    <li>If you change your mind about electronic consent, you have the right to request your electronic consent to be
        withdrawn and you can then provide consent in a non-electronic format; however, a copy of your electronic
        consent will be maintained for regulatory purposes. If you wish to withdraw your electronic consent please tell
        the study team.</li>
    <li>This agreement for electronic consent applies only to your consent to participate in this research study.</li>
</ul>
<!-- <b>18.	Additional Choices to Consider</b>
            <br/><br/>
            We would like to offer the opportunity to receive general results of the research and relevant individual results. You may also change your mind about this choice.  Please select your choice below:
            <br/><br/>
            <input type="radio" id="yessum" name="summaryagreement" value="Yes">
            <label for="yessum">YES, send me a summary of the research results and my individual results.</label>
            <br/>
            <input type="radio" id="nosum" name="summaryagreement" value="No">
            <label for="nosum">NO, do NOT send a summary of the research results or my individual results.</label>
            <br/><br/>
            The study team would like your permission to contact you about participating in future studies.   You may still join this study even if you do not permit future contact. You may also change your mind about this choice.  Please initial your choice below:
            <br/><br/>
            <input type="radio" id="yescontact" name="contactagreement" value="Yes">
            <label for="yescontact">YES, you may contact me</label>
            <br/>
            <input type="radio" id="nocontact" name="contactagreement" value="No">
            <label for="nocontact">NO, you may NOT contact me</label>
            <br/><br/> -->

<h3>Experimental Participant's Bill of Rights</h3>
<b>Every individual asked to participate in a research study has the right to be:</b>
<ol>
    <li>Informed about the nature and purpose of the study. </li>
    <li>Provided an explanation of the procedures to be followed in the research study, and whether any of the drugs,
        devices, or procedures is different from what would be used in standard practice. </li>
    <li>Given a description of any side effects, discomforts, or risks that you can reasonably expect to occur during
        the study.</li>
    <li>Informed about any benefits that would reasonably be expected from the participation in the study, if
        applicable.</li>
    <li>Informed of any alternative procedures, drugs, or devices that might be helpful, and their risks and benefits
        compared to the proposed procedures, drugs or devices.</li>
    <li>Told of the types of medical treatment, if any, available if complications should arise.</li>
    <li>Provided an opportunity to ask any questions concerning the research study both before agreeing to participate
        and at any time during the course of the study. </li>
    <li>Informed that individuals can refuse to participate in the research study. Participation is voluntary. Research
        participants may refuse to answer any question or discontinue their involvement at any time without penalty or
        loss of benefits to which they might otherwise be entitled. Their decision will not affect their right to
        receive the care they would receive if they were not in the experiment.</li>
    <li>Provided a copy of the signed and dated written consent form and a copy of this form. </li>
    <li>Given the opportunity to freely decide whether or not to consent to the research study without any force,
        coercion, or undue influence. </li>
</ol>
-------------------------------------------------------
<br /><br />
If you have any concerns or questions regarding the research study contact the researchers listed at the top of the
consent form.
<br /><br />
If you are unable to reach a member of the research team and have general questions, or you have concerns or complaints
about the research study, research team, or questions about your rights as a research participant, please contact:
<ul>
    <li>UC San Diego Office of IRB Administration at irb@ucsd.edu or 858-246-4777</li>
</ul>

</p>

<br />

</html>`;

export const thankYou = `
<html>

<body>
    <p style="text-align: center; font-size: 16px; padding: 2rem;">Thank you for filling out our survey! Happy coding!
    </p>
</body>

</html>`;