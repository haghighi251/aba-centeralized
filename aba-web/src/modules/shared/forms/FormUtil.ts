export const getFormValues = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    return Object.fromEntries(formData.entries());
};
