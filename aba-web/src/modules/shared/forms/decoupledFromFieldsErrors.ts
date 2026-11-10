export function decoupledFromFieldsErrors(errors: Array<string>): string | null {
    if (errors.length < 1) return null;
  
    return errors.join('<br>');
  }
