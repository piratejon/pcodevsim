
#include <algorithm>
#include <sstream>
#include <istream>
#include <iomanip>
#include <vector>

#include "pcodeprogram.h"
#include "pcodeline.h"
#include "value.h"

void PCodeProgram::insert_label ( const std::string & label, int offset ) {
  if ( ! hasLabel(label) ) {
    labels.insert(std::pair<std::string, int>(label, offset));
  } else {
    std::ostringstream o;
    o << "Attempted to redefine " << label << "(" << labels.at(label) << ") as " << offset;
    throw(o.str().c_str());
  }
}

void PCodeProgram::insert_reverse_label ( int offset, const std::string & label ) {
  if ( lookupLine(offset) == "" ) {
    reverse_labels.insert(std::pair<int, std::string>(offset, label));
  } else {
    std::ostringstream o;
    o << "Attempted to assign label " << label << " to line " << offset << " with label " << lookupLine(offset);
    throw(o.str().c_str());
  }
}

int PCodeProgram::insert_instruction ( PCodeLine & pl ) {
  istore.push_back(pl);
  return istore.size() - 1;
}

void PCodeProgram::input_file ( std::istream & in ) {
  std::string line;

  istore.clear();
  labels.clear();
  reverse_labels.clear();

  for ( lines_read = 0;
      std::getline(in, line);
      ++ lines_read ) {
    PCodeLine pl(line);
    // skip blank lines
    if ( line.length() > 0 ) {
      if ( pl.isValid() ) {
        if ( pl.definesLabel() ) {
          // explicitly defined label: "#define", "Lxxxx", "9001", ""
          int label_value;
          std::istringstream(pl.getOp1()) >> label_value;
          insert_label(pl.getOpcode(), label_value);
        } else if ( pl.getLabel() != "" ) {
          // implicitly defined label: "LXXXX", opcode, op1, op2
          int label_value;
          if ( pl.getOpcode() == "" && pl.getOp1() == "" && pl.getOp2() == "" ) {
            label_value = istore.size();
          } else {
            label_value = insert_instruction(pl);
          }
          insert_label(pl.getLabel(), label_value);
          insert_reverse_label(label_value, pl.getLabel());
        } else {
          // normal instruction
          insert_instruction(pl);
        }
      } else {
        std::ostringstream o;
        o << "Invalid instruction after " << lines_read << " lines.";
        throw(o.str().c_str());
      }
    }
  }
}

PCodeProgram::PCodeProgram ( std::istream & in ) {
  halted = true;
  input_file ( in );
}

int PCodeProgram::getLinesRead() {
  return lines_read;
}

int PCodeProgram::getLabelCount() {
  return labels.size();
}

bool PCodeProgram::hasLabel ( const std::string & l ) {
  return labels.find(l) != labels.end();
}

int PCodeProgram::lookupLabel ( const std::string & l ) {
  std::map<std::string, int>::iterator it = labels.find(l);
  return it == labels.end() ? -1 : it->second;
}

const std::string PCodeProgram::lookupLine ( int line ) {
  std::map<int, std::string>::iterator it = reverse_labels.find(line);
  return it == reverse_labels.end() ? "" : it->second;
}

void PCodeProgram::instruction_listing_format ( std::ostream & o, PCodeLine & pl ) {
  o << pl.getOpcode() << "\t";

  if ( hasLabel(pl.getOp1()) ) {
    o << labels[pl.getOp1()] << "\t";
  } else {
    o << pl.getOp1() << "\t";
  }

  if ( hasLabel(pl.getOp2()) ) {
    o << labels[pl.getOp2()] << "\t";
  } else {
    o << pl.getOp2() << "\t";
  }
}

void PCodeProgram::print_instruction_store ( std::ostream & o ) {
  std::vector<PCodeLine>::iterator it;

  for ( it = istore.begin(); it != istore.end(); ++ it ) {
    o << it - istore.begin() << "\t";
    instruction_listing_format(o, *it);
    o << "\n";
  }
}

int PCodeProgram::getEntryPoint ( ) {
  // defined as the "mst" with the greatest address
  for ( std::vector<PCodeLine>::reverse_iterator it = istore.rbegin();
      it != istore.rend();
      ++ it ) {
    if ( it->getOpcode() == "mst" ) {
      return istore.size() - (it - istore.rbegin()) - 1;
    }
  }

  return -1;
}

void PCodeProgram::print_labels ( std::ostream & o ) {
  o << "Labels:\n";
  for ( std::map<std::string,int>::iterator it = labels.begin();
      it != labels.end();
      ++ it ) {
    o << it->first << ": " << it->second << "\n";
  }
}

void PCodeProgram::display_execution_state ( std::ostream & o ) {

  int table_height;

  std::vector<PCodeLine>::iterator it;
  std::vector<DataCell>::reverse_iterator dt;

  o << "|=====================================================================================|\n";
  o << "|                                     Registers                                       |\n";
  o << "|-------------------------------------------------------------------------------------|\n";
  o << "|      pc        |       mp       |       sp       |       ep       |       np        |\n";
  o << "|-------------------------------------------------------------------------------------|\n";
  o << "|" << std::setw(8) << R.pc << std::setw(9) << "|" << std::setw(8) << R.mp << std::setw(9) << "|" << std::setw(8) << R.sp << std::setw(9) << "|" << std::setw(8) << R.ep << std::setw(9) << "|" << std::setw(8) << R.np << std::setw(11) << "|\n";
  o << "|=====================================================================================|\n";
  o << "|             Instruction Store            |                 Data Store               |\n";
  o << "|-------------------------------------------------------------------------------------|\n";
  o << "| Address | Opcode | Operand 1 | Operand 2 | Subprogram | Address | Id | Type | Value |\n";
  o << "|-------------------------------------------------------------------------------------|\n";

  table_height = std::max(istore.size(), dstore.size());

  it = istore.begin();
  dt = dstore.rbegin();

  for ( int i = 0; i < table_height; ++ i ) {
    if ( it != istore.end()
        && (
          table_height > istore.size()
          || table_height - i <= istore.size()
          )
       ) {
      o << "|"
        << std::setfill( ((it - istore.begin()) == R.pc) ? '*' : ' ' )
        << std::setw(9) << it - istore.begin() << "|"
        << std::setw(8) << it->getOpcode() << "|"
        << std::setw(11) << it->getOp1() << "|"
        << std::setw(11) << it->getOp2() << "|";
      ++ it;
    } else {
        o << "|         |        |           |           |";
    }

    o << std::setfill(' ');

    // figure out what subprogram we are in lol
    o << std::setw(12) << "            |";

    if ( dt != dstore.rend() && (
          table_height > dstore.size()
          || table_height - i <= dstore.size()
          )
       ) {
      o << std::setw(9) << dstore.size() - (dt - dstore.rbegin()) - 1 << "|"
        << std::setw(4) << dt->id << "|"
        << std::setw(6) << dt->v.getType() << "|"
        << std::setw(7) << dt->v.value_as_string() << "|";
      ++ dt;
    } else {
      o << "         |    |      |       |";
    }
    o << "\n";
  }
  o << "|=====================================================================================|\n";
}

void PCodeProgram::initialize_execution_environment ( ) {
  R.pc = getEntryPoint();

  R.mp = 0;
  R.sp = 0;
  R.ep = 0;
  R.np = 32767; // hmm?

  halted = false;

  dstore.clear();
}

bool PCodeProgram::isHalted ( ) {
  return halted;
}

void PCodeProgram::dstore_push ( const std::string & id, int type, const std::string & r ) {
  Value v(type, r);
  DataCell d = { id, v };
  dstore.push_back(d);
  ++ R.sp;
}

void PCodeProgram::step ( ) {
  // get the next instruction
  PCodeLine p = istore[R.pc];

  std::string o = p.getOpcode();
  std::string o1 = p.getOp1();
  std::string o2 = p.getOp2();

  if ( o == "stp" ) {
    hlt();
  } else if ( o == "mst" ) {
    mst(o1);
  } else if ( o == "cup" ) {
    cup(o1, o2);
  } else if ( o == "ent" ) {
    ent(o1, o2);
  } else if ( o == "rtn" ) {
    rtn();
  } else if ( o == "lvi" ) {
    lv("i", o1, o2);
  } else {
    std::ostringstream err;
    err << "unrecognized opcode "  <<  o  <<  " at "  <<  R.pc;
    throw(err.str().c_str());
  }

  // take action
}

int PCodeProgram::int_from_string ( const std::string & s ) {
  int i;
  std::istringstream ss(s);
  ss >> i;
  return i;
}

std::string PCodeProgram::string_from_int ( int i ) {
  std::ostringstream ss;
  ss << i;
  return ss.str();
}

int PCodeProgram::parent_frame_pointer ( int level, int _mp ) {
  if ( level == 0 ) {
    // the caller was in the enclosing block (static link == dynamic link)
    return _mp;
  } else {
    // follow the dynamic links backward through this block until the caller
    // was the enclosing block
    return parent_frame_pointer ( level - 1, dstore[get_frame_index(_mp, "dl")].v.value_as_integer() );
  }
}

int PCodeProgram::get_frame_index ( int frame, const std::string & label ) {
  if ( label == "rv" ) return frame;
  if ( label == "sl" ) return frame + 1;
  if ( label == "dl" ) return frame + 2;
  if ( label == "ep" ) return frame + 3;
  if ( label == "ra" ) return frame + 4;

  std::ostringstream o;
  o << "Requested non-label " << label << " for frame at " << frame;
  throw(o.str().c_str());
}

int PCodeProgram::get_frame_value ( int frame, const std::string & label ) {
  return dstore[get_frame_index ( frame, label )].v.value_as_integer();
}

int PCodeProgram::get_frame_index ( const std::string & label ) {
  return get_frame_index ( R.mp, label );
}

int PCodeProgram::get_frame_value ( const std::string & label ) {
  return get_frame_value ( R.mp, label );
}

void PCodeProgram::mst ( const std::string & level ) {

  // return value is space for this function's return value, if any
  dstore_push ( "rv", t_integer, "" );

  // static link points to stack frame of enclosing source block
  dstore_push ( "sl", t_integer, string_from_int ( parent_frame_pointer ( int_from_string(level), R.mp ) ) );

  // dynamic link points to this frame's caller's stack frame
  dstore_push ( "dl", t_integer, string_from_int ( R.mp ) );

  // extreme pointer, value of EP prior to call
  dstore_push ( "ep", t_integer, string_from_int ( R.ep ) );

  // return address set by cup; contains PC assumed on rtn

  // EP is the top of the enclosing scope's stack frame, so ours starts there
  R.mp = R.ep;

  // increment the program counter, we haven't called/jmp'd yet
  ++ R.pc;
}

void PCodeProgram::hlt ( ) {
  halted = true;
}

void PCodeProgram::cup ( const std::string & argsize, const std::string & iaddr ) {
  int p = hasLabel(argsize) ? lookupLabel(argsize) : int_from_string ( argsize );
  int q = hasLabel(iaddr) ? lookupLabel(iaddr) : int_from_string ( iaddr );

  R.mp = R.sp - ( p + 4 );

  dstore_push ( "ra", t_integer, string_from_int ( R.pc ) );

  R.pc = q;
}

void PCodeProgram::ent ( const std::string & reg, const std::string & str_amt ) {
  int amt = hasLabel(str_amt) ? lookupLabel(str_amt) : int_from_string(str_amt);

  if ( reg == "ep" ) {
    R.ep = R.mp + amt;
    ++ R.pc;
  } else if ( reg == "sp" ) {
    R.sp = R.mp + amt;
    ++ R.pc;
  } else {
    throw(9);
  }
}

void PCodeProgram::rtn ( ) {
  // kill the stack frame, basically undoing the mst prior to the cup
  R.sp = R.mp - 1;
}

void PCodeProgram::lv ( const std::string & type, const std::string & level, const std::string & offset ) {

  // lookup address of offset from level and push onto stack
  int address = parent_frame_pointer ( int_from_string ( level ), R.mp ) + int_from_string ( offset );
  dstore_push ( "", type_from_string ( type ), string_from_int ( address ) );

  ++ R.pc;
}

Value PCodeProgram::dstore_pop ( ) {
  Value v = dstore.back().v;
  dstore.pop();
  -- R.sp;
  return v;
}

void PCodeProgram::sfn_read ( int type ) {
  int dest_addr = dstore_pop ( ).value_as_integer();

  bool b;
  char c;
  int i;
  double r;

  switch ( type ) {
    case t_boolean:
    case t_character:
    case t_integer:
//      user_input_stream >> i;
//      address_store
    case t_real:
      break;
    default:
      throw("Attempted to read type " + string_from_int ( type ));
  }
}

void PCodeProgram::csp ( const std::string & sfn ) {
  if ( sfn == "rdb" || sfn == "rdc" || sfn == "rdi" || sfn == "rdr" ) {
    sfn_read ( type_from_string ( sfn[2] ) );
  } else {
    throw("Unrecognized standard function " + sfn);
  }
}

