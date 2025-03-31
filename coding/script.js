// script.js

document.addEventListener("DOMContentLoaded", () => {
    const stockTableBody = document.querySelector("#stockTable tbody");
    
    // Sample data
    let stockItems = [
        { name: "Item A", quantity: 50, price: 10 },
        { name: "Item B", quantity: 30, price: 15 }
    ];

    // Render stock items
    const renderStockItems = () => {
        stockTableBody.innerHTML = "";
        stockItems.forEach((item, index) => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${item.name}</td>
                <td>${item.quantity}</td>
                <td>${item.price}</td>
                <td><button onclick="sellItem(${index})">Sell</button></td>`;
            stockTableBody.appendChild(row);
        });
    };

    // Sell item function
    window.sellItem = (index) => {
        const soldItem = stockItems[index];
        stockItems.splice(index, 1);
        alert(`Sold ${soldItem.name}`);
        renderStockItems();
    };

    renderStockItems();
});
