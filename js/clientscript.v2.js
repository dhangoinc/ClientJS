/**
 * Copyright 2023, dhango, Inc.
 */

class dhangoPaymentMethod {
    static get Card() {
        return "Card";
    }
    static get ACH() {
        return "ACH";
    }
}

const dhango = class {
    #fieldSets = [];
    #paymentMethod = null;
    #culture = "en";
    #supportedCultures = ["en" /* add more cultures as we get translations, "es" */];
    #localization = new localization();
    #cardExpirationCharacterCount = 0;

    constructor() {
        this.tokenOwnerAccountKey = null;
        this.paymentMethodAccountKey = null;
        this.baseUrl = "";
        this.changePaymentMethodHandler = null;
    }

    set culture(value) {
        if (this.#supportedCultures.includes(value) == true) {
            this.#culture = value;
            this.#localization.culture = value;
        }
    }

    get culture() {
        return this.#culture;
    }

    get isValid() {
        var validInput = false;
        var paymentMethod = this.#paymentMethod;

        this.#fieldSets.forEach(function (fieldSet) {
            if (fieldSet.id == paymentMethod) {
                // This is now the active field set. The input is valid until we find otherwise.
                validInput = true;

                for (var input of fieldSet.getElementsByTagName("label")) {
                    if (input.id.endsWith('-error-label') && input.style.display == '') {
                        validInput = false;
                    }
                }
            }
        });

        return validInput;
    }

    get paymentMethod() {
        return this.#paymentMethod;
    }

    get card() {
        if (this.#paymentMethod != dhangoPaymentMethod.Card)
            return null;

        return {
            cardHolder: document.getElementById('cardAccountHolder').value,
            cardNumber: document.getElementById('cardAccountNumber').value,
            expirationMonth: this.cardExpirationMonth,
            expirationYear: this.cardExpirationYear,
            securityCode: document.getElementById('securityCode').value
        };
    }

    get ach() {
        if (this.#paymentMethod != dhangoPaymentMethod.ACH)
            return null;

        return {
            bankAccountHolder: document.getElementById('bankAccountHolder').value,
            routingNumber: document.getElementById('routingNumber').value,
            accountNumber: document.getElementById('bankAccountNumber').value,
            bankAccountType: document.querySelector('input[name="bankAccountType"]:checked').value
        };
    }

    get address() {
        if (this.#paymentMethod != dhangoPaymentMethod.Card)
            return null;

        return {
            postalCode: document.getElementById('postalCode').value
        };
    }

    get cardExpirationMonth() {
        var cardExpiration = document.getElementById('cardExpiration');

        if (cardExpiration.value != '') {
            var parts = cardExpiration.value.split('/');

            if (parts.length != 2)
                return 0;

            if (!this.isNumeric(parts[0]))
                return 0;

            return Number(parts[0]);
        }

        return 0;
    }

    get cardExpirationYear() {
        var cardExpiration = document.getElementById('cardExpiration');

        if (cardExpiration.value != '') {
            var parts = cardExpiration.value.split('/');

            if (parts.length != 2)
                return 0;

            if (!this.isNumeric(parts[1]))
                return 0;

            return Number(parts[1]);
        }

        return 0;
    }

    createRadio({ name, value, label: labelText, iconCssClass }) {
        const label = document.createElement('label');
        label.setAttribute('class', 'radio-container');

        const radio = document.createElement('input');
        radio.setAttribute('type', 'radio');
        radio.setAttribute('name', name);
        radio.setAttribute('value', value);
        radio.setAttribute('class', 'radio-input');
        label.appendChild(radio);

        const radioLabelWrapper = document.createElement('span');
        radioLabelWrapper.setAttribute('class', 'radio-label');

        const radioIcon = document.createElement('span');
        radioIcon.setAttribute('class', `radio-label-icon ${iconCssClass ?? ''}`);

        const radioLabel = document.createElement('span');
        radioLabel.setAttribute('class', 'radio-label-text');
        radioLabel.textContent = labelText;

        radioLabelWrapper.appendChild(radioIcon);
        radioLabelWrapper.appendChild(radioLabel);
        label.appendChild(radioLabelWrapper)

        return label;
    }

    createPaymentMethodFormContainer(radio, cssClasses = []) {
        const container = document.createElement('div');
        container.setAttribute('class', `payment-method-container ${cssClasses.join(' ')}`);
        container.appendChild(radio);

        const fieldset = document.createElement('div');
        fieldset.setAttribute('class', 'fieldset');
        container.appendChild(fieldset);

        return container;
    }

    displayTokenForm(elementId) {
        const formFieldsRowCssClass = 'form-fields-row';
        const dhangoContainer = document.createElement("div");
        dhangoContainer.id = "dhangoContainer";
        document.getElementById(elementId).appendChild(dhangoContainer);

        if (this.supportedPaymentMethods.includes(dhangoPaymentMethod.Card)) {
            const cardFieldSet = document.createElement("fieldset");

            cardFieldSet.setAttribute("id", dhangoPaymentMethod.Card);
            cardFieldSet.style.display = "none";

            cardFieldSet.appendChild(this.createFormElement("cardAccountHolder", this.#localization.getTranslation("cardAccountHolder"), { placeholder: this.#localization.getTranslation("firstAndLastName") }));

            const cardNumberContainer = document.createElement("div");
            cardNumberContainer.id = "cardNumberContainer";
            cardNumberContainer.setAttribute('class', formFieldsRowCssClass);

            cardNumberContainer.appendChild(this.createFormElement("cardAccountNumber", this.#localization.getTranslation("cardAccountNumber"), { numbersOnly: true, minimumLength: 15, maximumLength: 16, input: this.cardNumberInput, placeholder: "1234123412341234", containerId: "card-number-input-container" }));
            cardNumberContainer.appendChild(this.createFormElement("cardExpiration", this.#localization.getTranslation("cardExpiration"), { numbersOnly: false, minimumLength: 5, maximumLength: 5, input: this.cardExpirationInput, placeholder: "MM/YY" }));

            cardFieldSet.appendChild(cardNumberContainer);

            const cardVerificationContainer = document.createElement("div");
            cardVerificationContainer.id = "cardVerificationContainer";
            cardVerificationContainer.setAttribute('class', formFieldsRowCssClass);

            cardVerificationContainer.appendChild(this.createFormElement("securityCode", this.#localization.getTranslation("securityCode"), { numbersOnly: true, minimumLength: 3, maximumLength: 4, placeholder: "CVV" }));
            cardVerificationContainer.appendChild(this.createFormElement("postalCode", this.#localization.getTranslation("postalCode"), { numbersOnly: false, minimumLength: 5, maximumLength: 10, placeholder: "12345" }));

            cardFieldSet.appendChild(cardVerificationContainer);

            const radioButton = this.createRadio({
                name: 'paymentMethod',
                value: dhangoPaymentMethod.Card,
                label: this.#localization.getTranslation('card'),
                iconCssClass: 'radio-label-icon-card'
            });
            const paymentMethodFormContainer = this.createPaymentMethodFormContainer(
              radioButton, [`payment-method-${dhangoPaymentMethod.Card}`]
            );
            paymentMethodFormContainer
              .getElementsByClassName('fieldset')[0]
              .appendChild(cardFieldSet);
            dhangoContainer.appendChild(paymentMethodFormContainer);

            this.#fieldSets.push(cardFieldSet);
        }

        if (this.supportedPaymentMethods.includes(dhangoPaymentMethod.ACH)) {
            const achFieldSet = document.createElement("fieldset");

            achFieldSet.setAttribute("id", dhangoPaymentMethod.ACH);
            achFieldSet.style.display = "none";

            const bankAccountTypeSection = document.createElement("span");

            this.addSelectionOption(bankAccountTypeSection, "CorporateChecking", this.#localization.getTranslation("corporateChecking"), "bankAccountType", true);
            this.addSelectionOption(bankAccountTypeSection, "CorporateSavings", this.#localization.getTranslation("corporateSavings"), "bankAccountType", false);
            this.addSelectionOption(bankAccountTypeSection, "PersonalChecking", this.#localization.getTranslation("personalChecking"), "bankAccountType", false);
            this.addSelectionOption(bankAccountTypeSection, "PersonalSavings", this.#localization.getTranslation("personalSavings"), "bankAccountType", false);

            achFieldSet.appendChild(bankAccountTypeSection);

            let inputContainer = document.createElement("div");
            inputContainer.id = "bankAccountHolderContainer";
            inputContainer.setAttribute('class', formFieldsRowCssClass);

            inputContainer.appendChild(this.createFormElement("bankAccountHolder", this.#localization.getTranslation("bankAccountHolder"), { placeholder: this.#localization.getTranslation("bankAccountHolder") }));
            inputContainer.appendChild(this.createFormElement("routingNumber", this.#localization.getTranslation("routingNumber"), { numbersOnly: true, minimumLength: 9, maximumLength: 9, placeholder: "123456789" }));

            achFieldSet.appendChild(inputContainer);

            inputContainer = document.createElement("div");
            inputContainer.id = "bankAccountNumberContainer";
            inputContainer.setAttribute('class', formFieldsRowCssClass);

            inputContainer.appendChild(this.createFormElement("bankAccountNumber", this.#localization.getTranslation("bankAccountNumber"), { numbersOnly: true, minimumLength: 4, maximumLength: 16, placeholder: "123456" }));
            inputContainer.appendChild(this.createFormElement("confirmBankAccountNumber", this.#localization.getTranslation("confirmBankAccountNumber"), { numbersOnly: true, minimumLength: 4, maximumLength: 16, placeholder: "123456" }));

            achFieldSet.appendChild(inputContainer);

            const radio = this.createRadio({
                name: 'paymentMethod',
                value: dhangoPaymentMethod.ACH,
                label: this.#localization.getTranslation('ach'),
                iconCssClass: 'radio-label-icon-ach'
            });
            const formContainer = this.createPaymentMethodFormContainer(radio, [`payment-method-${dhangoPaymentMethod.ACH}`]);
            formContainer
              .getElementsByClassName('fieldset')[0]
              .appendChild(achFieldSet);
            dhangoContainer.appendChild(formContainer);

            this.#fieldSets.push(achFieldSet);
        }

        if (this.#fieldSets.length > 0) {
            this.#paymentMethod = this.#fieldSets[0].id;
            dhangoContainer.querySelector(`input[type='radio'][value=${this.#paymentMethod}]`).checked = true;
            this.setPaymentMethod(this.#paymentMethod);


            if (this.#fieldSets[0].form != null) {
                this.#fieldSets[0].form.addEventListener('submit', this.validate);
            }
        }

        // Hide the button panels if there are not multiple payment method options.
        if (this.#fieldSets.length <= 1) {
            const paymentMethodRadioButtons = dhangoContainer.getElementsByClassName('radio-container');
            for (const radio of paymentMethodRadioButtons) {
                radio.style.display = 'none';
            }
        }

        var bankAccountNumber = document.getElementById('bankAccountNumber');
        var confirmBankAccountNumber = document.getElementById('confirmBankAccountNumber');

        if (confirmBankAccountNumber != null) {
            bankAccountNumber.addEventListener('blur', (event) => {
                this.validateBankAccountNumbers(bankAccountNumber, this);
            });

            confirmBankAccountNumber.addEventListener('blur', (event) => {
                this.validateBankAccountNumbers(confirmBankAccountNumber, this);
            });
        }

        var cardExpiration = document.getElementById('cardExpiration');

        if (cardExpiration != null) {
            cardExpiration.addEventListener('blur', (event) => {
                this.validateCardExpiration(cardExpiration, this);
            });
        }

        // set radio button selected state change handlers
        const paymentMethodRadioButtons = dhangoContainer
          .querySelectorAll('input[type=\'radio\'][name=\'paymentMethod\']');
        const self = this;
        for (let i = 0; i < paymentMethodRadioButtons.length; i++) {
            const radioButton = paymentMethodRadioButtons[i];
            radioButton.addEventListener('change', function() {
                self.setPaymentMethod(this.value);

                if (self.changePaymentMethodHandler != null) {
                    self.changePaymentMethodHandler();
                }
            });
        }
    }

    validate(target) {
        var activeFieldSet = null;
        var cardFieldSet = document.getElementById(dhangoPaymentMethod.Card);
        var achFieldSet = document.getElementById(dhangoPaymentMethod.ACH);

        if (cardFieldSet != null && cardFieldSet.style.display == '') {
            activeFieldSet = cardFieldSet;
        }
        else if (achFieldSet != null && achFieldSet.style.display == '') {
            activeFieldSet = achFieldSet;
        }

        if (activeFieldSet != null) {
            for (var input of activeFieldSet.getElementsByTagName("input")) {
                input.dispatchEvent(new Event('blur', { bubbles: false }));
            }
        }
    }

    isNumeric(n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    }

    setInputError(inputId, errorMessage) {
        var input = document.getElementById(inputId);
        var errorLabel = document.getElementById(input.id + '-error-label');

        errorLabel.textContent = errorMessage;
        errorLabel.style.display = '';

        input.classList.add("invalid-input");
    }

    cardNumberInput(input) {
        var number = input.target.value;
        var cardType = '';
        var cardNumberContainer = document.getElementById('cardAccountNumber-container');

        cardNumberContainer.classList.remove("empty-card");
        cardNumberContainer.classList.remove("jcb");
        cardNumberContainer.classList.remove("visa");
        cardNumberContainer.classList.remove("discover");
        cardNumberContainer.classList.remove("mastercard");
        cardNumberContainer.classList.remove("americanexpress");

        // Visa
        var regularExpression = new RegExp("^4");
        if (number.match(regularExpression) != null)
            cardNumberContainer.classList.add("visa");

        // Mastercard 
        // Updated for Mastercard 2017 BINs expansion
        if (/^(5[1-5][0-9]{14}|2(22[1-9][0-9]{12}|2[3-9][0-9]{13}|[3-6][0-9]{14}|7[0-1][0-9]{13}|720[0-9]{12}))$/.test(number))
            cardNumberContainer.classList.add("mastercard");

        // AMEX
        regularExpression = new RegExp("^3[47]");
        if (number.match(regularExpression) != null)
            cardNumberContainer.classList.add("americanexpress");

        // Discover
        regularExpression = new RegExp("^(6011|622(12[6-9]|1[3-9][0-9]|[2-8][0-9]{2}|9[0-1][0-9]|92[0-5]|64[4-9])|65)");
        if (number.match(regularExpression) != null)
            cardNumberContainer.classList.add("discover");

        // Diners
        regularExpression = new RegExp("^36");
        if (number.match(regularExpression) != null)
            cardType = "Diners";

        // Diners - Carte Blanche
        regularExpression = new RegExp("^30[0-5]");
        if (number.match(regularExpression) != null)
            cardType = "Diners - Carte Blanche";

        // JCB
        regularExpression = new RegExp("^35(2[89]|[3-8][0-9])");
        if (number.match(regularExpression) != null)
            cardNumberContainer.classList.add("jcb");

        // Visa Electron
        regularExpression = new RegExp("^(4026|417500|4508|4844|491(3|7))");
        if (number.match(regularExpression) != null)
            cardType = "Visa Electron";
    }

    cardExpirationInput(input) {
        var inputValue = input.target.value;

        if (inputValue.length == 2 && d.#cardExpirationCharacterCount < inputValue.length) {
           input.target.value = inputValue.concat('/');
        }

        if (input.target.value != null) {
            input.target.value = input.target.value.replace('//', '/');
        }

        d.#cardExpirationCharacterCount = input.target.value.length;
    }

    validateCardExpiration(input, d) {
        var cardExpiration = document.getElementById('cardExpiration');
        var errorLabel = document.getElementById('cardExpiration-error-label');
        var isValid = false;

        if (cardExpiration.value != '') {
            var parts = cardExpiration.value.split('/');

            if (parts.length != 2) {
                isValid = false;
            } else {
                var month = parts[0];
                var year = parts[1];
                var date = new Date();
                var currentYear = date.getFullYear();
                var currentMonth = date.getMonth();

                if (d.isNumeric(month) == false || d.isNumeric(year) == false) {
                    isValid = false;
                } else if (Number(month) < 1 || Number(month) > 12) {
                    isValid = false;
                } else if ((Number(year) + 2000) > currentYear) {
                    isValid = true;
                } else if ((Number(year) + 2000) == currentYear && currentMonth <= Number(month)) {
                    isValid = true;
                }
            }

            if (isValid == false) {
                errorLabel.textContent = d.#localization.getTranslation("invalidExpiration");
                errorLabel.style.display = '';

                input.classList.add("invalid-input");
            } else {
                errorLabel.textContent = '';
                errorLabel.style.display = 'none';

                input.classList.remove("invalid-input");
            }
        }
    }

    validateInput(input, d) {
        var errorLabel = document.getElementById(input.id + '-error-label');

        if (input.value == '') {
            var label = document.getElementById(input.id + '-label');

            errorLabel.textContent = label.textContent + d.#localization.getTranslation("isRequired");
            errorLabel.style.display = '';

            input.classList.add("invalid-input");
        } else {
            errorLabel.textContent = '';
            errorLabel.style.display = 'none';

            input.classList.remove("invalid-input");
        }
    }

    validateBankAccountNumbers(input, d) {
        var bankAccountNumber = document.getElementById('bankAccountNumber');
        var confirmBankAccountNumber = document.getElementById('confirmBankAccountNumber');
        var errorLabel = document.getElementById('confirmBankAccountNumber-error-label');

        if (confirmBankAccountNumber.value == '')
            return;

        if (bankAccountNumber.value != confirmBankAccountNumber.value) {
            errorLabel.textContent = d.#localization.getTranslation("bankAccountNumbersMustMatch");
            errorLabel.style.display = '';

            confirmBankAccountNumber.classList.add("invalid-input");
        } else {
            errorLabel.style.display = 'none';

            confirmBankAccountNumber.classList.remove("invalid-input");
        }
    }

    createFormElement(inputId, labelText, options) {
        var formElement = document.createElement("div");
        formElement.setAttribute("id", inputId + "-container");
        formElement.setAttribute("class", "form-input-element");

        var labelSpan = document.createElement("span");
        labelSpan.setAttribute("class", "input-label-container");

        var label = document.createElement("label");
        label.setAttribute("id", inputId + "-label");
        label.setAttribute("for", inputId);
        label.textContent = labelText;

        labelSpan.appendChild(label);

        var inputSpan = document.createElement("span");
        inputSpan.setAttribute("class", "input-field");

        var input = document.createElement("input");
        input.setAttribute("id", inputId);
        input.setAttribute("name", inputId);
        input.setAttribute("type", "text");

        if (typeof options !== 'undefined') {
            if (options.numbersOnly == true) {
                input.setAttribute("type", "number");
                input.setAttribute("oninput", "this.value = this.value.slice(0, this.maxLength)");

                input.addEventListener('keydown', function (e) {
                    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                        e.preventDefault();

                        return false;
                    }
                });
            }

            if (options.minimumLength > 0) {
                input.setAttribute("minlength", options.minimumLength);
            }

            if (options.maximumLength > 0) {
                input.setAttribute("maxlength", options.maximumLength);
            }

            if (options.input != null) {
                input.addEventListener('input', options.input);
            }

            if (options.keyup != null) {
                input.addEventListener('keyup', options.keyup);
            }

            if (options.placeholder != null) {
                input.setAttribute('placeholder', options.placeholder);
            }

            if (options.containerId) {
                inputSpan.setAttribute("id", options.containerId);
            }
        }

        input.addEventListener('blur', (event) => {
            this.validateInput(input, this);
            return true;
        });

        inputSpan.appendChild(input);

        var errorLabelSpan = document.createElement("span");
        errorLabelSpan.setAttribute("class", "error-label-container");

        var errorLabel = document.createElement("label");
        errorLabel.setAttribute("id", inputId + '-error-label');

        errorLabelSpan.appendChild(errorLabel);

        formElement.appendChild(labelSpan);
        formElement.appendChild(inputSpan);
        formElement.appendChild(errorLabelSpan);

        return formElement;
    }

    addSelectionOption(section, value, text, groupName, selected) {
        var option = document.createElement("input");
        option.type = "radio";
        option.id = value + "id";
        option.name = groupName;
        option.value = value;

        if (selected) {
            option.checked = true;
        }

        var label = document.createElement("label");
        label.setAttribute("for", value + "id");
        label.textContent = text;

        section.appendChild(option);
        section.appendChild(label);
    }

    setRequiredOnChildrenInputs(parent, isRequired) {
        for (const input of parent.getElementsByTagName("input")) {
            input.setAttribute("data-required", isRequired);
        }
    }

    setPaymentMethod(paymentMethod) {
        this.#paymentMethod = paymentMethod;

        this.#fieldSets.forEach(function (fieldSet) {
            const [paymentMethodFormContainer] = document
              .getElementsByClassName(`payment-method-container payment-method-${fieldSet.id}`);

            if (fieldSet.id === paymentMethod) {
                fieldSet.style.display = null;
                paymentMethodFormContainer.classList.add('payment-method-container-active');
                this.setRequiredOnChildrenInputs(paymentMethodFormContainer, true);
            } else {
                fieldSet.style.display = "none";
                paymentMethodFormContainer.classList.remove('payment-method-container-active');
                this.setRequiredOnChildrenInputs(paymentMethodFormContainer, false);
            }
        }, this);
    }

    async saveToken(postTokenHandler, postTokenErrorHandler) {
        if (this.isValid) {
            var postTokenRequest = {
                card: this.card,
                ach: this.ach,
                address: this.address
            };

            this.createToken(postTokenRequest, postTokenHandler, postTokenErrorHandler);
        }
    }

    resetAllInputs() {
        this.#fieldSets.forEach(function (fieldSet) {
            for (var input of fieldSet.getElementsByTagName("input")) {
                if (input.type == 'text' || input.type == 'number')
                    input.value = '';
            }
        });

        var corporateChecking = document.getElementById("CorporateCheckingid");

        if (corporateChecking != null) {
            corporateChecking.checked = true;
        }
    }

    async getPayerFees(amount, getPayerFeesHandler) {
        var response = await fetch(this.baseUrl + '/payerFees?amount=' + amount, {
            method: "GET",
            headers: {
                "Content-type": "application/json; charset=UTF-8",
                "accountKey": this.paymentMethodAccountKey,
                "culture": this.#culture
            }
        });

        var result = await response.json();

        if (response.status == 200) {
            getPayerFeesHandler(result);
        } else {
            getPayerFeesHandler({ cardFee: null, achFee: null });
        }
    }

    async createToken(postTokenRequest, postTokenHandler, postTokenErrorHandler) {
        var response = await fetch(this.baseUrl + '/tokens', {
            method: "POST",
            body: JSON.stringify(postTokenRequest),
            headers: {
                "Content-type": "application/json; charset=UTF-8",
                "accountKey": this.paymentMethodAccountKey,
                "culture": this.#culture
            }
        });

        var result = await response.json();

        if (response.status == 201) {
            postTokenHandler(result);
        } else {
            for (let fieldName in result.errors) {
                if (fieldName == 'Card.CardHolder') {
                    this.setInputError('cardAccountHolder', result.errors[fieldName][0]);
                }
                else if (fieldName == 'Card.CardNumber') {
                    this.setInputError('cardAccountNumber', result.errors[fieldName][0]);
                }
                else if (fieldName == 'Card.ExpirationMonth') {
                    this.setInputError('cardExpiration', result.errors[fieldName][0]);
                }
                else if (fieldName == 'Card.ExpirationYear') {
                    this.setInputError('cardExpiration', result.errors[fieldName][0]);
                }
                else if (fieldName == 'Card.PostalCode') {
                    this.setInputError('postalCode', result.errors[fieldName][0]);
                }
                else if (fieldName == 'Ach.RoutingNumber') {
                    this.setInputError('routingNumber', result.errors[fieldName][0]);
                }
                else if (fieldName == 'Ach.AccountNumber') {
                    this.setInputError('bankAccountNumber', result.errors[fieldName][0]);
                }
            }

            postTokenErrorHandler(result.errors);
        }
    }
};

const localization = class {
    culture = "en";

    getTranslation(name) {
        var value = this.#translations[this.culture][name];

        if (value != undefined)
            return value;

        console.log('No translation found for ' + name);

        return '';
    }

    #translations = {
        "en": {
            "card": "Card",
            "ach": "US Bank Account",
            "cardAccountHolder": "Card Holder",
            "bankAccountHolder": "Account Holder",
            "cardAccountNumber": "Card Number",
            "cardExpiration": "Expiration",
            "securityCode": "Security Code",
            "postalCode": "Postal Code",
            "corporateChecking": "Corporate Checking",
            "corporateSavings": "Corporate Savings",
            "personalChecking": "Personal Checking",
            "personalSavings": "Personal Savings",
            "routingNumber": "Routing Number",
            "bankAccountNumber": "Account Number",
            "confirmBankAccountNumber": "Confirm Account Number",
            "isRequired": " is required.",
            "bankAccountNumbersMustMatch": "The bank account numbers must match.",
            "invalidExpiration": "The expiration date is invalid.",
            "firstAndLastName": "First and Last Name"
        },
        "es": {

        }
    };
}