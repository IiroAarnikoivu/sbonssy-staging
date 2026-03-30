import Select, { components } from "react-select";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";

// Custom dropdown indicator
const DropdownIndicator = (props) => {
  const {
    selectProps: { menuIsOpen },
  } = props;

  return (
    <components.DropdownIndicator {...props}>
      {menuIsOpen ? <FiChevronUp /> : <FiChevronDown />}
    </components.DropdownIndicator>
  );
};

export default DropdownIndicator;
