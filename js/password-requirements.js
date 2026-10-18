export const passwordRequirements = [
    { id: "ruleLength", label: "At least 12 characters", test: (value) => value.length >= 12 },
    { id: "ruleUpper", label: "At least one uppercase letter", test: (value) => /[A-Z]/.test(value) },
    { id: "ruleLower", label: "At least one lowercase letter", test: (value) => /[a-z]/.test(value) },
    { id: "ruleDigit", label: "At least one digit", test: (value) => /\d/.test(value) },
    { id: "ruleSymbol", label: "At least one symbol", test: (value) => /[^A-Za-z0-9]/.test(value) },
];

export function getPasswordRequirementResults(value) {
    return passwordRequirements.map(({ id, test }) => ({ id, met: test(value) }));
}
