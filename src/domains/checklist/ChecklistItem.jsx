import "./Checklist.css";

function ChecklistItem({ item, isSelected, onToggle }) {
  return (
    <div
      className={`check-card ${isSelected ? "selected" : ""}`}
      onClick={() => onToggle(item.itemId)}
    >
      <div className="check-card-title">{item.itemName}</div>
      <div className="check-card-desc">{item.description}</div>
    </div>
  );
}

export default ChecklistItem;
