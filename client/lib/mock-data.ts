export const mockCSVData = {
  customers: {
    filename: 'customers.csv',
    data: [
      [
        'customer_id',
        'full_name',
        'email_address',
        'phone_number',
        'street_address',
        'registration_date',
        'total_orders',
      ],
      [
        '1001',
        'John Smith',
        'john.smith@email.com',
        '(555) 123-4567',
        '123 Main St, Anytown, ST 12345',
        '2023-01-15',
        '5',
      ],
      [
        '1002',
        'Sarah Johnson',
        'sarah.j@gmail.com',
        '(555) 234-5678',
        '456 Oak Ave, Springfield, ST 67890',
        '2023-02-20',
        '12',
      ],
      [
        '1003',
        'Michael Brown',
        'm.brown@company.org',
        '(555) 345-6789',
        '789 Pine Rd, Riverside, ST 11111',
        '2023-03-10',
        '3',
      ],
      [
        '1004',
        'Emily Davis',
        'emily.davis@hotmail.com',
        '(555) 456-7890',
        '321 Elm St, Brookville, ST 22222',
        '2023-04-05',
        '8',
      ],
      [
        '1005',
        'Robert Wilson',
        'bob.wilson@yahoo.com',
        '(555) 567-8901',
        '654 Maple Dr, Lakeside, ST 33333',
        '2023-05-12',
        '15',
      ],
    ],
  },

  products: {
    filename: 'products.csv',
    data: [
      ['product_code', 'item_name', 'category', 'unit_price', 'stock_quantity', 'supplier_name'],
      ['P001', 'Wireless Headphones', 'Electronics', '$89.99', '45', 'TechCorp'],
      ['P002', 'Coffee Maker', 'Appliances', '$129.99', '23', 'HomeGoods Inc'],
      ['P003', 'Running Shoes', 'Sports', '$159.99', '67', 'SportMax'],
      ['P004', 'Office Chair', 'Furniture', '$299.99', '12', 'OfficeSupply Co'],
      ['P005', 'Smartphone', 'Electronics', '$699.99', '34', 'TechCorp'],
    ],
  },

  sales: {
    filename: 'sales_data.csv',
    data: [
      ['transaction_id', 'customer_name', 'product_sold', 'sale_amount', 'sale_date', 'sales_rep'],
      ['T2023001', 'Alice Cooper', 'Laptop Pro', '$1299.99', '2023-06-01', 'James Wilson'],
      ['T2023002', 'Bob Martin', 'Desk Lamp', '$45.99', '2023-06-02', 'Sarah Lee'],
      ['T2023003', 'Carol Smith', 'Office Supplies', '$89.50', '2023-06-03', 'Mike Johnson'],
      ['T2023004', 'David Brown', 'Gaming Mouse', '$79.99', '2023-06-04', 'James Wilson'],
      ['T2023005', 'Eva Johnson', 'Monitor', '$299.99', '2023-06-05', 'Sarah Lee'],
    ],
  },

  employees: {
    filename: 'employee_roster.csv',
    data: [
      ['emp_id', 'employee_name', 'department', 'hire_date', 'salary', 'manager'],
      ['E001', 'Jennifer Adams', 'Marketing', '2022-03-15', '$65000', 'Susan Taylor'],
      ['E002', 'Tom Rodriguez', 'Engineering', '2021-08-22', '$85000', 'Mark Chen'],
      ['E003', 'Lisa Wang', 'Sales', '2023-01-10', '$55000', 'David Miller'],
      ['E004', "Kevin O'Brien", 'HR', '2020-11-05', '$60000', 'Patricia Jones'],
      ['E005', 'Rachel Green', 'Finance', '2022-07-18', '$70000', 'Robert Kim'],
    ],
  },
};

export const suggestedCaptions = {
  general: ['Name', 'Email', 'Phone', 'Address', 'Date', 'Amount', 'ID', 'Category'],
  customers: [
    'Customer Name',
    'Email Address',
    'Phone Number',
    'Address',
    'Registration Date',
    'Order Count',
  ],
  products: ['Product Name', 'Category', 'Price', 'Stock Level', 'Supplier'],
  sales: ['Customer', 'Product', 'Amount', 'Date', 'Sales Representative'],
  employees: ['Employee Name', 'Department', 'Hire Date', 'Salary', 'Manager'],
};

export const getRandomMockData = () => {
  const datasets = Object.values(mockCSVData);
  return datasets[Math.floor(Math.random() * datasets.length)];
};

export const getSuggestedCaptionsForData = (csvColumns: string[]) => {
  // Analyze column names to suggest appropriate caption categories
  const columnText = csvColumns.join(' ').toLowerCase();

  if (columnText.includes('customer') || columnText.includes('client')) {
    return suggestedCaptions.customers;
  } else if (columnText.includes('product') || columnText.includes('item')) {
    return suggestedCaptions.products;
  } else if (columnText.includes('sale') || columnText.includes('transaction')) {
    return suggestedCaptions.sales;
  } else if (columnText.includes('employee') || columnText.includes('staff')) {
    return suggestedCaptions.employees;
  } else {
    return suggestedCaptions.general;
  }
};
