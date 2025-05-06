/**
 * Copyright 2023, dhango, Inc.
 */

const NUMERIC_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
const BACKSPACE_DELETE_KEYS = ['Backspace', 'Delete'];
const LEFT_RIGHT_ARROW_KEYS = ['ArrowLeft', 'ArrowRight'];
const CTRL_CMD_KEYS = ['Control', 'Meta'];
const TAB_KEY = 'Tab';

// Suppresses keys not included in allowedKeys array
function onlyAllowKeys(allowedKeys, allowCtrlCombinations) {
    return function (event) {
        const isCtrlCombination = (event.ctrlKey || event.metaKey) && ['a', 'c', 'v'].includes(event.key.toLowerCase());
        if (!allowedKeys.includes(event.key) && !(allowCtrlCombinations && isCtrlCombination)) {
            event.preventDefault();
        }
    }
}

function setCaretPosition(el, caretPosition) {
    if (!el) {
        return;
    }

    if (el.createTextRange) {
        const range = el.createTextRange();
        range.move('character', caretPosition);
        range.select();
    } else if (el.selectionStart) {
        el.setSelectionRange(caretPosition, caretPosition);
    }
}

class dhangoPaymentMethod {
    static get Card() {
        return "Card";
    }

    static get ACH() {
        return "ACH";
    }

    static get ACSS() {
        return 'ACSS';
    }

    static get BECS() {
        return 'BECS';
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
        this.validateAccount = false;
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
        let validInput = false;
        const paymentMethod = this.#paymentMethod;

        this.#fieldSets.forEach(function (fieldSet) {
            if (fieldSet.id === paymentMethod) {
                // This is now the active field set. The input is valid until we find otherwise.
                validInput = true;

                for (const input of fieldSet.getElementsByTagName('label')) {
                    if (input.id.endsWith('-error-label') && input.style.display === '') {
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
            cardNumber: document.getElementById('cardAccountNumber').value?.replace(/\s+/g, ''),
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

    get acss() {
        if (this.#paymentMethod !== dhangoPaymentMethod.ACSS) {
            return null;
        }

        return {
            accountHolder: this.getFieldValue('acssAccountHolder'),
            institutionNumber: this.getFieldValue('acssInstitutionNumber'),
            transitNumber: this.getFieldValue('acssTransitNumber'),
            accountNumber: this.getFieldValue('acssAccountNumber'),
            bankAccountType: document.querySelector('input[name="acssBankAccountType"]:checked').value
        }
    }

    get becs() {
        if (this.#paymentMethod !== dhangoPaymentMethod.BECS) {
            return null;
        }

        return {
            bankAccountHolder: this.getFieldValue('becsAccountHolder'),
            bsb: this.getFieldValue('becsBsb'),
            accountNumber: this.getFieldValue('becsAccountNumber'),
        }
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

        if (iconCssClass) {
            radioLabelWrapper.appendChild(radioIcon);
        }
        radioLabelWrapper.appendChild(radioLabel);
        label.appendChild(radioLabelWrapper)

        return label;
    }

    createPaymentMethodFormContainer(radio, paymentMethod, cssClasses = []) {
        const container = document.createElement('div');
        container.setAttribute('class', `payment-method-container ${cssClasses.join(' ')}`);
        container.appendChild(radio);

        const fieldset = document.createElement('div');
        fieldset.setAttribute('class', 'fieldset');
        container.appendChild(fieldset);

        container.style.cursor = "pointer";

        container.onclick = event => {
            this.setPaymentMethod(paymentMethod);

            if (this.changePaymentMethodHandler != null) {
                this.changePaymentMethodHandler();
            }
        }

        return container;
    }

    async displayTokenForm(elementId) {
        const formFieldsRowCssClass = 'form-fields-row';
        const dhangoContainer = document.createElement('div');
        dhangoContainer.id = 'dhangoContainer';
        document.getElementById(elementId).appendChild(dhangoContainer);

        // Loading indicator
        const loadingIndicatorEl = this.buildLoadingIndicator();
        dhangoContainer.appendChild(loadingIndicatorEl);

        const apiEnabledPaymentMethods = await this.getSupportedPaymentMethods();
        dhangoContainer.removeChild(loadingIndicatorEl);

        // Load payment methods error
        if (!apiEnabledPaymentMethods) {
            dhangoContainer.appendChild(this.buildErrorMessage('errorGetPaymentMethods'));
            document.getElementById('submit').disabled = true;

            return;
        }

        // No payment methods available error
        if (!apiEnabledPaymentMethods.length) {
            dhangoContainer.appendChild(this.buildErrorMessage('errorNoPaymentMethods'));
            document.getElementById('submit').disabled = true;

            return;
        }

        if (apiEnabledPaymentMethods.includes(dhangoPaymentMethod.Card)) {
            const cardFieldSet = document.createElement("fieldset");

            cardFieldSet.setAttribute("id", dhangoPaymentMethod.Card);
            cardFieldSet.style.display = "none";

            cardFieldSet.appendChild(this.createFormElement("cardAccountHolder", this.#localization.getTranslation("cardAccountHolder"), { placeholder: this.#localization.getTranslation("firstAndLastName") }));

            const cardNumberContainer = document.createElement("div");
            cardNumberContainer.id = "cardNumberContainer";
            cardNumberContainer.setAttribute('class', formFieldsRowCssClass);

            cardNumberContainer.appendChild(this.createFormElement("cardAccountNumber", this.#localization.getTranslation("cardAccountNumber"), {
                minimumLength: 18, // 15 digits (in 4 groups) + 3 whitespaces
                maximumLength: 19, // 16 digits (in 4 groups) + 3 whitespaces
                input: this.cardNumberInput,
                placeholder: "1234 1234 1234 1234",
                containerId: "card-number-input-container",
                keydown: onlyAllowKeys([...NUMERIC_KEYS, ...BACKSPACE_DELETE_KEYS, ...LEFT_RIGHT_ARROW_KEYS, ...CTRL_CMD_KEYS, TAB_KEY], true),
            }));
            cardNumberContainer.appendChild(this.createFormElement("cardExpiration", this.#localization.getTranslation("cardExpiration"), {
                numbersOnly: false,
                minimumLength: 5,
                maximumLength: 5,
                input: this.cardExpirationInput,
                placeholder: "MM/YY"
            }));

            cardFieldSet.appendChild(cardNumberContainer);

            const cardVerificationContainer = document.createElement("div");
            cardVerificationContainer.id = "cardVerificationContainer";
            cardVerificationContainer.setAttribute('class', formFieldsRowCssClass);

            cardVerificationContainer.appendChild(this.createFormElement("securityCode", this.#localization.getTranslation("securityCode"), {
                numbersOnly: true,
                minimumLength: 3,
                maximumLength: 4,
                placeholder: "CVV"
            }));
            cardVerificationContainer.appendChild(this.createFormElement("postalCode", this.#localization.getTranslation("postalCode"), {
                numbersOnly: false,
                minimumLength: 5,
                maximumLength: 10,
                placeholder: "12345"
            }));

            cardFieldSet.appendChild(cardVerificationContainer);

            const radioButton = this.createRadio({
                name: 'paymentMethod',
                value: dhangoPaymentMethod.Card,
                label: this.#localization.getTranslation('card'),
                iconCssClass: 'radio-label-icon-card'
            });
            const paymentMethodFormContainer = this.createPaymentMethodFormContainer(
                radioButton, 'Card', [`payment-method-${dhangoPaymentMethod.Card}`]
            );
            paymentMethodFormContainer
                .getElementsByClassName('fieldset')[0]
                .appendChild(cardFieldSet);
            dhangoContainer.appendChild(paymentMethodFormContainer);

            this.#fieldSets.push(cardFieldSet);
        }

        if (apiEnabledPaymentMethods.includes(dhangoPaymentMethod.ACH)) {
            const achFieldSet = document.createElement('fieldset');

            achFieldSet.setAttribute('id', dhangoPaymentMethod.ACH);
            achFieldSet.style.display = 'none';

            // Bank Account Type selection
            achFieldSet.appendChild(this.buildBankAccountTypeSection(
                ['CorporateChecking', 'CorporateSavings', 'PersonalChecking', 'PersonalSavings'], 'bankAccountType'
            ));

            let inputContainer = document.createElement("div");
            inputContainer.id = "bankAccountHolderContainer";
            inputContainer.setAttribute('class', formFieldsRowCssClass);

            inputContainer.appendChild(this.createFormElement("bankAccountHolder", this.#localization.getTranslation("bankAccountHolder"), { placeholder: this.#localization.getTranslation("bankAccountHolder") }));
            inputContainer.appendChild(this.createFormElement("routingNumber", this.#localization.getTranslation("routingNumber"), {
                numbersOnly: true,
                minimumLength: 9,
                maximumLength: 9,
                placeholder: "123456789"
            }));

            achFieldSet.appendChild(inputContainer);

            inputContainer = document.createElement("div");
            inputContainer.id = "bankAccountNumberContainer";
            inputContainer.setAttribute('class', formFieldsRowCssClass);

            inputContainer.appendChild(this.createFormElement("bankAccountNumber", this.#localization.getTranslation("bankAccountNumber"), {
                numbersOnly: true,
                minimumLength: 4,
                maximumLength: 16,
                placeholder: "123456"
            }));
            inputContainer.appendChild(this.createFormElement("confirmBankAccountNumber", this.#localization.getTranslation("confirmBankAccountNumber"), {
                numbersOnly: true,
                minimumLength: 4,
                maximumLength: 16,
                placeholder: "123456"
            }));

            achFieldSet.appendChild(inputContainer);

            const radio = this.createRadio({
                name: 'paymentMethod',
                value: dhangoPaymentMethod.ACH,
                label: this.#localization.getTranslation('ach'),
                iconCssClass: 'radio-label-icon-ach'
            });
            const formContainer = this.createPaymentMethodFormContainer(radio, 'ACH', [`payment-method-${dhangoPaymentMethod.ACH}`]);
            formContainer
                .getElementsByClassName('fieldset')[0]
                .appendChild(achFieldSet);
            dhangoContainer.appendChild(formContainer);

            this.#fieldSets.push(achFieldSet);
        }

        // ACSS
        if (apiEnabledPaymentMethods.includes(dhangoPaymentMethod.ACSS)) {
            const acssFieldSet = this.buildAcssForm(formFieldsRowCssClass, dhangoContainer);
            const paymentMethodFormContainer = this.createSelectablePaymentMethodFormContainer({
                paymentMethod: dhangoPaymentMethod.ACSS,
                // The ach class is left in for backwards compatibility since it was in there before and we don't want a breaking change.
                radioIcon: 'radio-label-icon-acss radio-label-icon-ach',
                fieldSet: acssFieldSet
            });

            dhangoContainer.appendChild(paymentMethodFormContainer);
            this.#fieldSets.push(acssFieldSet);
        }

        // AU BECS
        if (apiEnabledPaymentMethods.includes(dhangoPaymentMethod.BECS)) {
            const becsFieldSet = this.buildBecsForm(formFieldsRowCssClass);
            const paymentMethodFormContainer = this.createSelectablePaymentMethodFormContainer({
                paymentMethod: dhangoPaymentMethod.BECS,
                radioIcon: 'radio-label-icon-becs',
                fieldSet: becsFieldSet
            });

            dhangoContainer.appendChild(paymentMethodFormContainer);
            this.#fieldSets.push(becsFieldSet);

            const bsbInputEl = document.getElementById('becsBsb');
            if (bsbInputEl) {
                bsbInputEl.addEventListener('blur', () => {
                    this.validateBsb(bsbInputEl, this);
                });
            }
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
            radioButton.addEventListener('change', function () {
                self.setPaymentMethod(this.value);

                if (self.changePaymentMethodHandler != null) {
                    self.changePaymentMethodHandler();
                }
            });
        }
    }

    validate(target) {
        let activeFieldSet = null;
        const cardFieldSet = document.getElementById(dhangoPaymentMethod.Card);
        const achFieldSet = document.getElementById(dhangoPaymentMethod.ACH);
        const acssFieldSet = document.getElementById(dhangoPaymentMethod.ACSS);
        const becsFieldSet = document.getElementById(dhangoPaymentMethod.BECS);

        if (cardFieldSet != null && cardFieldSet.style.display == '') {
            activeFieldSet = cardFieldSet;
        } else if (achFieldSet != null && achFieldSet.style.display == '') {
            activeFieldSet = achFieldSet;
        } else if (acssFieldSet !== null && acssFieldSet.style.display == '') {
            activeFieldSet = acssFieldSet;
        } else if (becsFieldSet !== null && becsFieldSet.style.display == '') {
            activeFieldSet = becsFieldSet;
        }

        if (activeFieldSet != null) {
            for (const input of activeFieldSet.getElementsByTagName('input')) {
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

    cardNumberInput(inputEvent) {
        const inputEl = inputEvent.target;
        const number = inputEl.value.replace(/\s+/g, '');
        const cardNumberContainer = document.getElementById('cardAccountNumber-container');
        let cardType = '';

        cardNumberContainer.classList.remove("empty-card");
        cardNumberContainer.classList.remove("jcb");
        cardNumberContainer.classList.remove("visa");
        cardNumberContainer.classList.remove("discover");
        cardNumberContainer.classList.remove("mastercard");
        cardNumberContainer.classList.remove("americanexpress");

        // Visa
        let regularExpression = new RegExp("^4");
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

        // Format the value to have a whitespace between 4 characters groups
        // Preserve the caret index if user types in in the middle of the input text
        const groups = number.match(/.{1,4}/g);
        const caretPosition = inputEl.selectionStart;
        if (groups) {
            const formattedValue = groups.join(' ');
            inputEvent.target.value = formattedValue;

            // maintain caret position if user types in the middle of the input value
            if (caretPosition < formattedValue.length - 1) {
                const pos = caretPosition === number.length ? formattedValue.length : caretPosition;
                setCaretPosition(inputEl, pos);
            }
        } else {
            inputEvent.target.value = '';
        }
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

    validateBsb(input, d) {
        const errorLabel = document.getElementById('becsBsb-error-label');

        if (/^\d{3}-\d{3}$/.test(input.value)) {
            errorLabel.style.display = 'none';
            errorLabel.classList.remove('invalid-input');
            input.classList.remove('invalid-input');
            return;
        }

        errorLabel.textContent = d.#localization.getTranslation("becsBsbFormat");
        errorLabel.style.display = '';
        errorLabel.classList.add('invalid-input');
        input.classList.add('invalid-input');
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

                if (options.maximumLength) {
                    input.setAttribute("oninput", "this.value = this.value.slice(0, this.maxLength)");
                }

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

            if (!!options.keydown) {
                input.addEventListener('keydown', options.keydown);
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

    addSelectionOption(section, value, text, groupName, selected, idPrefix) {
        const option = document.createElement('input');
        // id prefix is used to avoid having multiple radios with the same id across different forms.
        // We cannot simply change the id naming strategy due to backwards compatibility (e.g. there could be css styles
        // (re-)defined for a given in)
        const id = `${idPrefix ? idPrefix + '-' : ''}${value}id`;

        option.type = 'radio';
        option.id = id;
        option.name = groupName;
        option.value = value;
        option.setAttribute('class', `radio-${groupName}`);

        if (selected) {
            option.checked = true;
        }

        const label = document.createElement('label');
        label.setAttribute('for', id);
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

                let radioContainer = paymentMethodFormContainer.getElementsByClassName('radio-container');

                if (radioContainer.length > 0) {
                    Array.prototype.forEach.call(radioContainer[0].getElementsByClassName('radio-input'), function (input) {
                        input.checked = 'checked';
                    });
                }
            } else {
                fieldSet.style.display = "none";
                paymentMethodFormContainer.classList.remove('payment-method-container-active');
                this.setRequiredOnChildrenInputs(paymentMethodFormContainer, false);

                let radioContainer = paymentMethodFormContainer.getElementsByClassName('radio-container');

                if (radioContainer.length > 0) {
                    Array.prototype.forEach.call(radioContainer[0].getElementsByClassName('radio-input'), function (input) {
                        input.checked = '';
                    });
                }
            }
        }, this);
    }

    async saveToken(postTokenHandler, postTokenErrorHandler) {
        if (this.isValid) {
            const postTokenRequest = {
                card: this.card,
                ach: this.ach,
                acss: this.acss,
                becs: this.becs,
                address: this.address,
                validateAccount: this.validateAccount
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
        const response = await fetch(this.baseUrl + '/tokens', {
            method: 'POST',
            body: JSON.stringify(postTokenRequest),
            headers: {
                'Content-type': 'application/json; charset=UTF-8',
                'accountKey': this.tokenOwnerAccountKey ?? this.paymentMethodAccountKey,
                'culture': this.#culture
            }
        });
        const result = await response.json();

        if (response.status === 201) {
            postTokenHandler(result);
        } else {
            for (let fieldName in result.errors) {
                const [fieldError] = result.errors[fieldName];

                if (fieldName === 'Card.CardHolder') {
                    this.setInputError('cardAccountHolder', fieldError);
                } else if (fieldName === 'Card.CardNumber') {
                    this.setInputError('cardAccountNumber', fieldError);
                } else if (fieldName === 'Card.ExpirationMonth') {
                    this.setInputError('cardExpiration', fieldError);
                } else if (fieldName === 'Card.ExpirationYear') {
                    this.setInputError('cardExpiration', fieldError);
                } else if (fieldName === 'Card.PostalCode') {
                    this.setInputError('postalCode', fieldError);
                } else if (fieldName === 'Ach.RoutingNumber') {
                    this.setInputError('routingNumber', fieldError);
                } else if (fieldName === 'Ach.AccountNumber') {
                    this.setInputError('bankAccountNumber', fieldError);
                } else if (fieldName === 'Acss.AccountHolder') {
                    this.setInputError('acssAccountHolder', fieldError);
                } else if (fieldName === 'Acss.InstitutionNumber') {
                    this.setInputError('acssInstitutionNumber', fieldError);
                } else if (fieldName === 'Acss.TransitNumber') {
                    this.setInputError('acssTransitNumber', fieldError);
                } else if (fieldName === 'Acss.AccountNumber') {
                    this.setInputError('acssAccountNumber', fieldError);
                } else if (fieldName === 'Becs.BankAccountHolder') {
                    this.setInputError('becsAccountHolder', fieldError);
                } else if (fieldName === 'Becs.AccountNumber') {
                    this.setInputError('becsAccountNumber', fieldError);
                } else if (fieldName === 'Becs.Bsb') {
                    this.setInputError('becsBsb', fieldError);
                }
            }

            postTokenErrorHandler(result.errors);
        }
    }

    async getSupportedPaymentMethods() {
        const response = await fetch(`${this.baseUrl}/accounts/${this.paymentMethodAccountKey}`, {
            method: 'GET',
            headers: {
                'Content-type': 'application/json; charset=UTF-8',
                'accountKey': this.paymentMethodAccountKey,
                'culture': this.#culture
            }
        });

        const result = await response.json().catch(() => ({ status: 500 }));

        return response.status === 200 ? result.supportedPaymentMethods : null;
    }

    getFieldValue(fieldId) {
        return document.getElementById(fieldId).value;
    }

    createSelectablePaymentMethodFormContainer(data) {
        const { paymentMethod, radioIcon, fieldSet } = data;

        const radioButton = this.createRadio({
            name: 'paymentMethod',
            value: paymentMethod,
            label: this.#localization.getTranslation(paymentMethod.toLowerCase()),
            iconCssClass: radioIcon ?? ''
        });
        const paymentMethodFormContainer = this.createPaymentMethodFormContainer(
            radioButton, paymentMethod, [`payment-method-${paymentMethod}`]
        );

        paymentMethodFormContainer.getElementsByClassName('fieldset')[0].appendChild(fieldSet);

        return paymentMethodFormContainer;
    }

    buildAcssForm(formFieldsRowCssClass) {
        const fieldSet = document.createElement('fieldset');

        fieldSet.setAttribute('id', dhangoPaymentMethod.ACSS);
        fieldSet.style.display = 'none';

        // Bank Account Type selection
        fieldSet.appendChild(this.buildBankAccountTypeSection([
            { value: 'PersonalChecking', label: 'Personal' },
            { value: 'CorporateChecking', label: 'Corporate' }
        ], 'acssBankAccountType', 'acss'));

        // Account Holder & Institution Number
        const formRow1 = document.createElement('div');
        formRow1.id = 'acss-form-row-1';
        formRow1.setAttribute('class', formFieldsRowCssClass);

        // Account Holder
        formRow1.appendChild(
            this.createFormElement('acssAccountHolder', this.#localization.getTranslation('acssAccountHolder'), {
                placeholder: this.#localization.getTranslation('bankAccountHolder')
            })
        );

        // Institution Number
        formRow1.appendChild(
            this.createFormElement('acssInstitutionNumber', this.#localization.getTranslation('acssInstitutionNumber'), {
                placeholder: '123',
                numbersOnly: true,
                minimumLength: 3,
                maximumLength: 3,
            })
        );

        fieldSet.appendChild(formRow1);

        // Transit Number & Account Number fields
        const formRow2 = document.createElement('div');
        formRow2.id = 'acss-form-row-2';
        formRow2.setAttribute('class', formFieldsRowCssClass);

        // Transit Number
        formRow2.appendChild(
            this.createFormElement('acssTransitNumber', this.#localization.getTranslation('acssTransitNumber'), {
                numbersOnly: true,
                minimumLength: 1,
                maximumLength: 5,
                placeholder: '12345',
            })
        );

        // Account Number
        formRow2.appendChild(
            this.createFormElement('acssAccountNumber', this.#localization.getTranslation('acssAccountNumber'), {
                numbersOnly: true,
                placeholder: '123456',
            })
        );

        fieldSet.appendChild(formRow2);

        return fieldSet;
    }

    buildBecsForm(formFieldsRowCssClass) {
        const fieldSet = document.createElement('fieldset');

        fieldSet.setAttribute('id', dhangoPaymentMethod.BECS);
        fieldSet.style.display = 'none';

        // Account Holder & BSB
        const formRow1 = document.createElement('div');
        formRow1.id = 'becs-form-row-1';
        formRow1.setAttribute('class', formFieldsRowCssClass);

        // Account Holder
        formRow1.appendChild(
            this.createFormElement('becsAccountHolder', this.#localization.getTranslation('becsAccountHolder'), {
                placeholder: this.#localization.getTranslation('becsAccountHolder')
            })
        );

        // BSB
        formRow1.appendChild(
            this.createFormElement('becsBsb', this.#localization.getTranslation('becsBsb'), {
                placeholder: '000-000',
                // auto-append dash ('-') after 3rd number to achieve '###-###' format
                input: function () {
                    // keep previous value to correctly handle backspace / delete of the '-'
                    let previousValue = null;

                    return function (event) {
                        const target = event.target;
                        let value = (target.value?.toString() || '').replaceAll(/[^\d,\-]/gi, '');

                        if (previousValue?.length === 7 && value.length > 7) {
                            target.value = previousValue;
                            return;
                        }

                        if (value.length === 3 && previousValue?.length < 3 && !value.includes('-')) {
                            value = value + '-';
                        }

                        if (value.length > 3 && !value.includes('-')) {
                            value = value.substring(0, 3) + '-' + value.substring(3, 6);
                        }

                        target.value = value;
                        previousValue = value;
                    }
                }(),
                keydown: function (event) {
                    const dashKeyCode = 189;
                    const dashKeyCodeNumpad = 109;

                    if ([dashKeyCode, dashKeyCodeNumpad].includes(event.keyCode)) {
                        event.preventDefault();
                    }
                }
            })
        );

        fieldSet.appendChild(formRow1);

        // Account Number group
        const formRow2 = document.createElement('div');
        formRow2.id = 'becs-form-row-2';
        formRow2.setAttribute('class', formFieldsRowCssClass);

        // Account Number
        formRow2.appendChild(
            this.createFormElement('becsAccountNumber', this.#localization.getTranslation('becsAccountNumber'), {
                numbersOnly: true,
                placeholder: '123456',
            })
        );

        fieldSet.appendChild(formRow2);

        return fieldSet;
    }

    buildBankAccountTypeSection(bankAccountTypes, groupName, idPrefix) {
        const bankAccountTypeSectionEl = document.createElement('span');

        bankAccountTypes.forEach((bankAccountType, index) => {
            const bankAccountTypeValue = typeof bankAccountType === 'object' ? bankAccountType.value : bankAccountType;
            const bankAccountTypeLabel = typeof bankAccountType === 'object' ? bankAccountType.label : bankAccountType;

            this.addSelectionOption(bankAccountTypeSectionEl, bankAccountTypeValue,
                this.#localization.getTranslation(this.lowercaseFirst(bankAccountTypeLabel)), groupName, index === 0, idPrefix);
        });

        return bankAccountTypeSectionEl;
    }

    buildLoadingIndicator() {
        const loader = document.createElement('span');
        loader.setAttribute('class', 'loader');

        const text = document.createElement('span');
        text.setAttribute('class', 'loader-text');
        text.appendChild(document.createTextNode(this.#localization.getTranslation('loadingPaymentMethods')));

        const loaderContainer = document.createElement('div');
        loaderContainer.setAttribute('class', 'loader-container');

        loaderContainer.appendChild(loader);
        loaderContainer.appendChild(text);

        return loaderContainer;
    }

    buildErrorMessage(error) {
        const text = document.createElement('span');
        text.appendChild(document.createTextNode(this.#localization.getTranslation(error)));

        const errorContainer = document.createElement('div');
        errorContainer.setAttribute('class', 'error-container');

        errorContainer.appendChild(text);

        return errorContainer;
    }

    lowercaseFirst(s) {
        const value = s?.trim();

        return value ? value.charAt(0).toLocaleLowerCase() + value.substring(1) : '';
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
            "firstAndLastName": "First and Last Name",
            "acss": "Canadian Bank Account",
            "acssAccountHolder": "Account Holder",
            "acssAccountNumber": "Account Number",
            "acssInstitutionNumber": "Institution Number",
            "acssTransitNumber": "Transit Number",
            "personal": "Personal",
            "corporate": "Corporate",
            "becs": "BECS",
            "becsAccountHolder": "Bank Account Holder",
            "becsBsb": "BSB",
            "becsAccountNumber": "Account Number",
            "becsBsbFormat": "The BSB must be formatted as '###-###'",
            "loadingPaymentMethods": 'Loading available payment methods...',
            "errorGetPaymentMethods": "Failed to load available payment methods",
            "errorNoPaymentMethods": "No payment methods configured for an account"
        },
        "es": {}
    };
}