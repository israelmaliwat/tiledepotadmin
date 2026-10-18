export function parseProfileName(displayName) {
    const name = displayName?.trim();
    if (!name) {
        return { lastName: "", firstName: "", middleName: "" };
    }

    const commaIndex = name.indexOf(",");
    if (commaIndex >= 0) {
        const lastName = name.slice(0, commaIndex).trim();
        const givenNames = name.slice(commaIndex + 1).trim();
        const middleSeparatorIndex = givenNames.indexOf(" | ");
        if (middleSeparatorIndex >= 0) {
            return {
                lastName,
                firstName: givenNames.slice(0, middleSeparatorIndex).trim(),
                middleName: givenNames.slice(middleSeparatorIndex + 3).trim(),
            };
        }

        return {
            lastName,
            firstName: givenNames,
            middleName: "",
        };
    }

    const nameParts = name.split(/\s+/).filter(Boolean);
    if (nameParts.length < 2) {
        return { lastName: "", firstName: nameParts[0] || "", middleName: "" };
    }

    return {
        lastName: nameParts[nameParts.length - 1],
        firstName: nameParts[0],
        middleName: nameParts.slice(1, -1).join(" "),
    };
}

export function formatProfileName(displayName) {
    const name = displayName?.trim();
    if (!name) return "";

    const { lastName, firstName, middleName } = parseProfileName(name);
    if (!lastName || !firstName) return name.toUpperCase();

    const middleInitial = middleName ? ` ${middleName[0].toUpperCase()}.` : "";
    return `${lastName}, ${firstName}${middleInitial}`.toUpperCase();
}

export function buildProfileName({ lastName, firstName, middleName }) {
    const name = `${lastName}, ${firstName}`;
    return middleName ? `${name} | ${middleName}` : name;
}
