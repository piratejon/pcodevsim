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

#include "pcodeprogram.h"
#include "pcodeline.h"

namespace {
  class PCodeVSim : public :: testing::Test {
  };

  TEST_F(PCodeVSim, test_pcodeprogram) {
    PCodeProgram * p = NULL;
    std::istringstream i(
"L00004    ent       sp        L00005    \n"
"          ent       ep        L00006    \n"
"          lvi       0         6         \n"
"          ldc       i         0         \n"
"          equ       i                   \n"
"          fjp                 L00007    \n"
"          lda       0         0         \n"
"          lvi       0         5         \n"
"          sti       i                   \n"
"          ujp                 L00008    \n"
"L00007                                  \n"
"          lda       0         0         \n"
"          mst       1                   \n"
"          lvi       0         6         \n"
"          lvi       0         5         \n"
"          lvi       0         6         \n"
"          mod                           \n"
"          cup       2         L00004    \n"
"          sti       i                   \n"
"L00008                                  \n"
"          rtn       i                   \n"
"#define   L00005    6                   \n"
"#define   L00006    15                  \n"
"L00001    ent       sp        L00002    \n"
"          ent       ep        L00003    \n"
"          lvi       0         5         \n"
"          csp                 rdi       \n"
"          lvi       0         6         \n"
"          csp                 rdi       \n"
"          mst       0                   \n"
"          lvi       0         5         \n"
"          lvi       0         6         \n"
"          cup       2         L00004    \n"
"          ldc       i         5         \n"
"          csp                 wri       \n"
"          rtn       p                   \n"
"#define   L00002    6                   \n"
"#define   L00003    14                  \n"
"          mst       0                   \n"
"          cup       0         L00001    \n"
"          stp                           \n"
    );

    p = new PCodeProgram(i);

    ASSERT_EQ(p->getLinesRead(), 41);

    delete p;
  }

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

