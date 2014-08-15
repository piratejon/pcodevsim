/*****************************************************************************
 * File test_main.cpp contains unit tests illustrating correct operation of
 * components of the p-code visual simulator.
 *
 * Author: Jonathan Wesley Stone
 * E-Mail: jstone25@uco.edu
 * Date: August 14, 2014
 *
 * Copyright: Jonathan Wesley Stone, 2014
 ****************************************************************************/

#include <gtest/gtest.h>

#include "pcodeline.h"
namespace {
  class PCodeVSim : public :: testing::Test {
  };

  TEST_F(PCodeVSim, test_pcodeline) {
    PCodeLine * pl;
    std::string s;

    s = "L00004    ent       sp        L00005    ";
    pl = new PCodeLine(s);
    ASSERT_EQ(pl->isValid(), true);
    ASSERT_EQ(pl->getLabel(), "L00004");
    ASSERT_EQ(pl->getOpcode(), "ent");
    ASSERT_EQ(pl->getOp1(), "sp");
    ASSERT_EQ(pl->getOp2(), "L00005");
    delete pl;

    s = "          ent      x x                  ";
    pl = new PCodeLine(s);
    ASSERT_EQ(pl->isValid(), true);
    ASSERT_EQ(pl->getLabel(), "");
    ASSERT_EQ(pl->getOpcode(), "ent      x");
    ASSERT_EQ(pl->getOp1(), "x");
    ASSERT_EQ(pl->getOp2(), "");
    delete pl;

    s = "L00004    ent       sp        L00005    12345";
    pl = new PCodeLine(s);
    ASSERT_EQ(pl->isValid(), true);
    ASSERT_EQ(pl->getLabel(), "L00004");
    ASSERT_EQ(pl->getOpcode(), "ent");
    ASSERT_EQ(pl->getOp1(), "sp");
    ASSERT_EQ(pl->getOp2(), "L00005    12345");
    delete pl;
  }
}

