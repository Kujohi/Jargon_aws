// Client-side utility functions for currency formatting
export const formatCurrency = (amount, currency = 'VND') => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: currency
  }).format(amount);
};

export const parseCurrencyToAmount = (currencyString) => {
  // Remove all non-numeric characters except decimal point
  const numericString = currencyString.replace(/[^\d.-]/g, '');
  return parseFloat(numericString) || 0;
}; 